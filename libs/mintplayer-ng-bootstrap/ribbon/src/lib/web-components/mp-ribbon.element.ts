import { css, html, LitElement, nothing, type TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { type RibbonTab } from '../types/ribbon.types';

/**
 * mp-ribbon — Microsoft Office–style Ribbon web component.
 *
 * Manages a tab strip with groupable items, overflow behavior, sizing,
 * contextual tabs, Quick Access Toolbar, and KeyTips.
 *
 * Phase 1: Core WC structure + tab strip navigation (roving tabindex, arrow keys)
 */
export class MpRibbon extends LitElement {
  static override styles = css`
    :host { display: block; }
    .ribbon-container {
      border: 1px solid var(--bs-border-color, #e0e0e0);
      background: var(--bs-body-bg, #fafafa);
    }
    .ribbon-tablist {
      display: flex;
      border-bottom: 2px solid var(--bs-border-color, #d0d0d0);
      background: var(--bs-tertiary-bg, #f5f5f5);
    }
    .ribbon-tab {
      padding: 10px 16px;
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      cursor: pointer;
      font-size: 14px;
      color: inherit;
      transition: all 0.15s ease;
    }
    .ribbon-tab:hover { background: var(--bs-secondary-bg, #f0f0f0); }
    .ribbon-tab.active {
      border-bottom-color: var(--bs-primary, #0d6efd);
      color: var(--bs-primary, #0d6efd);
      font-weight: 500;
    }
    .ribbon-tab:focus-visible {
      outline: 2px solid var(--bs-primary, #0d6efd);
      outline-offset: -2px;
    }
    .ribbon-content {
      padding: 0;
      background: var(--bs-body-bg, #fff);
      overflow: hidden;
    }
    .ribbon-panel[hidden] { display: none; }
    .ribbon-panel {
      display: flex;
      flex-wrap: nowrap;
      gap: 8px;
      align-items: stretch;
      min-width: 0;
    }
    ::slotted(*) {
      flex: 0 0 auto;
    }
  `;

  /** Array of tab objects: { id, label, [content] } */
  @property({ type: Array })
  tabs: RibbonTab[] = [];

  /** Currently active tab ID */
  @property({ type: String, attribute: 'active-tab-id' })
  activeTabId: string = '';

  /** Layout mode: 'classic' | 'simplified' */
  @property({ type: String })
  layout: 'classic' | 'simplified' = 'classic';

  /** True if ribbon is minimized (shows only tab strip) */
  @property({ type: Boolean })
  minimized: boolean = false;

  private currentTabIndex = 0;
  private resizeObserver?: ResizeObserver;
  private reflowFrame: number = 0;
  private readonly naturalWidths = new WeakMap<HTMLElement, number>();

  private get tabElements(): HTMLElement[] {
    return Array.from(this.renderRoot.querySelectorAll<HTMLElement>('[role="tab"]'));
  }

  constructor() {
    super();
  }

  override connectedCallback() {
    super.connectedCallback();
    this.setAttribute('role', 'application');
    this.setAttribute('aria-label', 'Ribbon');

    // If no active tab, default to first
    if (!this.activeTabId && this.tabs.length > 0) {
      this.activeTabId = this.tabs[0].id;
      this.currentTabIndex = 0;
    }

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.scheduleReflow());
      this.resizeObserver.observe(this);
    }
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.resizeObserver?.disconnect();
    if (this.reflowFrame) cancelAnimationFrame(this.reflowFrame);
  }

  override updated(changed: Map<string, unknown>): void {
    if (changed.has('activeTabId') || changed.has('tabs') || changed.has('minimized')) {
      this.scheduleReflow();
    }
  }

  override render(): TemplateResult {
    return html`
      <div class="ribbon-container">
        <!-- Tab strip -->
        <div role="tablist" class="ribbon-tablist" @keydown="${this.onTabListKeydown}">
          ${this.tabs.map((tab, index) => this.renderTab(tab, index))}
        </div>

        <!-- Content area (only visible if not minimized) -->
        ${!this.minimized ? html`
          <div class="ribbon-content">
            ${this.tabs.map((tab) => this.renderTabPanel(tab))}
          </div>
        ` : nothing}
      </div>
    `;
  }

  private renderTab(tab: RibbonTab, index: number): TemplateResult {
    const isActive = tab.id === this.activeTabId;
    const tabIndex = isActive ? 0 : -1;

    return html`
      <button
        role="tab"
        class="ribbon-tab ${isActive ? 'active' : ''}"
        aria-selected="${isActive}"
        aria-controls="ribbon-panel-${tab.id}"
        tabindex="${tabIndex}"
        data-tab-id="${tab.id}"
        @click="${() => this.selectTab(tab.id)}"
      >
        ${tab.label}
      </button>
    `;
  }

  private renderTabPanel(tab: RibbonTab): TemplateResult {
    const isActive = tab.id === this.activeTabId;
    return html`
      <div
        role="tabpanel"
        id="ribbon-panel-${tab.id}"
        class="ribbon-panel ${isActive ? 'active' : ''}"
        aria-labelledby="ribbon-tab-${tab.id}"
        ?hidden="${!isActive}"
      >
        <slot name="content-${tab.id}"></slot>
      </div>
    `;
  }

  private selectTab(tabId: string): void {
    const previousTabId = this.activeTabId;
    this.activeTabId = tabId;

    // Update roving tabindex
    const tabIndex = this.tabs.findIndex((t) => t.id === tabId);
    if (tabIndex !== -1) {
      this.currentTabIndex = tabIndex;
    }

    // Dispatch change event
    this.dispatchEvent(
      new CustomEvent('tab-change', {
        detail: { previousTabId, activeTabId: tabId },
        bubbles: true,
        composed: true,
      })
    );

    this.requestUpdate();
  }

  private onTabListKeydown = (event: KeyboardEvent): void => {
    const { key } = event;
    let handled = false;

    switch (key) {
      case 'ArrowLeft':
      case 'ArrowUp':
        this.focusPreviousTab();
        handled = true;
        break;

      case 'ArrowRight':
      case 'ArrowDown':
        this.focusNextTab();
        handled = true;
        break;

      case 'Home':
        this.focusTabAt(0);
        handled = true;
        break;

      case 'End':
        this.focusTabAt(this.tabs.length - 1);
        handled = true;
        break;

      case 'Enter':
      case ' ':
        // Activate focused tab
        const focusedTab = this.tabElements[this.currentTabIndex];
        if (focusedTab) {
          const tabId = focusedTab.getAttribute('data-tab-id');
          if (tabId) {
            this.selectTab(tabId);
            handled = true;
          }
        }
        break;
    }

    if (handled) {
      event.preventDefault();
    }
  };

  private focusPreviousTab(): void {
    const newIndex = Math.max(0, this.currentTabIndex - 1);
    this.focusTabAt(newIndex);
  }

  private focusNextTab(): void {
    const newIndex = Math.min(this.tabs.length - 1, this.currentTabIndex + 1);
    this.focusTabAt(newIndex);
  }

  private focusTabAt(index: number): void {
    if (index >= 0 && index < this.tabElements.length) {
      const tab = this.tabElements[index];
      tab.focus();
      this.currentTabIndex = index;

      // Optionally auto-select on arrow nav (APG Tabs pattern: automatic activation)
      // For now, just focus; Space/Enter required to select.
    }
  }

  private scheduleReflow(): void {
    if (this.reflowFrame) return;
    this.reflowFrame = requestAnimationFrame(() => {
      this.reflowFrame = 0;
      this.reflowOverflow();
    });
  }

  /**
   * Walks the active tab's groups and toggles `data-resolved-size="popup"` on
   * the rightmost group(s) until the tab content fits. On grow, expands the
   * leftmost popup'd group (i.e. the most-recently-collapsed) when room allows.
   *
   * MVP: single step per group (large -> popup). Author-declared reduceOrder
   * with intermediate sizes is a follow-up (FR-6 P0 deferred to later milestone).
   */
  private reflowOverflow(): void {
    if (this.minimized) return;
    const panel = this.renderRoot.querySelector<HTMLElement>(
      `#ribbon-panel-${this.activeTabId}`
    );
    if (!panel) return;

    const groups = this.collectActiveGroups(panel);
    if (groups.length === 0) return;

    // Snapshot each group's expanded width before any mutation.
    for (const group of groups) {
      if (group.getAttribute('data-resolved-size') !== 'popup') {
        this.naturalWidths.set(group, group.offsetWidth);
      }
    }

    const available = panel.clientWidth;
    const gap = 8;
    const occupied = () =>
      groups.reduce(
        (sum, g, i) => sum + g.offsetWidth + (i > 0 ? gap : 0),
        0
      );
    let mutated = false;

    // Collapse rightmost-first until content fits or no groups can collapse.
    let safety = groups.length;
    while (occupied() > available && safety-- > 0) {
      let collapsed = false;
      for (let i = groups.length - 1; i >= 0; i--) {
        if (groups[i].getAttribute('data-resolved-size') !== 'popup') {
          groups[i].setAttribute('data-resolved-size', 'popup');
          collapsed = true;
          mutated = true;
          break;
        }
      }
      if (!collapsed) break;
    }

    // If we have headroom, try expanding the leftmost popup'd group (which is
    // the most-recently-collapsed under right-first collapse order).
    if (occupied() < available) {
      for (const group of groups) {
        if (group.getAttribute('data-resolved-size') !== 'popup') continue;
        const natural = this.naturalWidths.get(group) ?? 0;
        const current = group.offsetWidth;
        const projected = occupied() + (natural - current);
        if (projected <= available) {
          group.removeAttribute('data-resolved-size');
          mutated = true;
        } else {
          break;
        }
      }
    }

    // Re-measure once more if we mutated; layout may settle into a new state
    // that itself crosses a threshold (e.g. expanding one then needing to
    // collapse another).
    if (mutated) {
      this.scheduleReflow();
    }
  }

  /**
   * Returns the `<mp-ribbon-group>` elements assigned to the active tab's slot.
   * Handles both raw web-component usage and the Angular `<bs-ribbon-group>`
   * wrapper (which delegates to an inner `<mp-ribbon-group>` via Angular's
   * `display: contents` host).
   */
  private collectActiveGroups(panel: HTMLElement): HTMLElement[] {
    const slot = panel.querySelector<HTMLSlotElement>('slot');
    if (!slot) return [];
    const groups: HTMLElement[] = [];
    for (const assigned of slot.assignedElements()) {
      if (assigned.tagName === 'MP-RIBBON-GROUP') {
        groups.push(assigned as HTMLElement);
        continue;
      }
      const inner = assigned.querySelector<HTMLElement>('mp-ribbon-group');
      if (inner) groups.push(inner);
    }
    return groups;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('mp-ribbon')) {
  customElements.define('mp-ribbon', MpRibbon);
}
