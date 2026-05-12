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
    :host {
      display: block;
      /* ---- Default tokens (neutral, Bootstrap-anchored) ---- */
      --bs-ribbon-app-accent: var(--bs-primary, #0d6efd);
      --bs-ribbon-font-family: inherit;
      --bs-ribbon-container-bg: var(--bs-body-bg, #fafafa);
      --bs-ribbon-container-border: var(--bs-border-color, #e0e0e0);
      --bs-ribbon-tabstrip-bg: var(--bs-tertiary-bg, #f5f5f5);
      --bs-ribbon-tabstrip-border: var(--bs-border-color, #d0d0d0);
      --bs-ribbon-tab-idle-color: inherit;
      --bs-ribbon-tab-hover-bg: var(--bs-secondary-bg, #f0f0f0);
      --bs-ribbon-tab-active-bg: transparent;
      --bs-ribbon-tab-active-color: var(--bs-ribbon-app-accent);
      --bs-ribbon-tab-active-indicator-color: var(--bs-ribbon-app-accent);
      --bs-ribbon-tab-active-indicator-width: 2px;
      --bs-ribbon-tab-radius: 0;
      --bs-ribbon-tab-padding: 10px 16px;
      --bs-ribbon-tabpanel-bg: var(--bs-body-bg, #fff);
      --bs-ribbon-group-separator: var(--bs-border-color, #e0e0e0);
      --bs-ribbon-group-separator-inset: 0px;
      --bs-ribbon-group-label-color: var(--bs-secondary-color, #6c757d);
      --bs-ribbon-item-hover-bg: var(--bs-secondary-bg, #e9ecef);
      --bs-ribbon-item-hover-border: var(--bs-border-color, #ced4da);
      --bs-ribbon-item-pressed-bg: var(--bs-secondary-bg, #dee2e6);
      --bs-ribbon-item-radius: 3px;
    }

    /* ---- Office 2007: glossy blue gradient, honey hover ---- */
    :host([version="office-2007"]) {
      --bs-ribbon-font-family: "Segoe UI", Tahoma, sans-serif;
      --bs-ribbon-container-bg: linear-gradient(#F4F8FD, #DCE7F5);
      --bs-ribbon-container-border: #5C85B6;
      --bs-ribbon-tabstrip-bg: linear-gradient(#C7DEFD, #A4C5F4);
      --bs-ribbon-tabstrip-border: #5C85B6;
      --bs-ribbon-tab-idle-color: #1F3A5F;
      --bs-ribbon-tab-hover-bg: linear-gradient(#FFE8A1, #FFC759);
      --bs-ribbon-tab-active-bg: linear-gradient(#F4F8FD, #DCE7F5);
      --bs-ribbon-tab-active-color: #1F3A5F;
      --bs-ribbon-tab-active-indicator-color: transparent;
      --bs-ribbon-tab-active-indicator-width: 0px;
      --bs-ribbon-tab-radius: 6px 6px 0 0;
      --bs-ribbon-tabpanel-bg: linear-gradient(#F4F8FD, #DCE7F5);
      --bs-ribbon-group-separator: rgba(0, 0, 0, 0.18);
      --bs-ribbon-group-separator-inset: 0px;
      --bs-ribbon-group-label-color: #3B5A82;
      --bs-ribbon-item-hover-bg: linear-gradient(#FFE8A1, #FFC759);
      --bs-ribbon-item-hover-border: #D9A03C;
      --bs-ribbon-item-pressed-bg: linear-gradient(#F5B23A, #E08A1A);
      --bs-ribbon-item-radius: 2px;
    }

    /* ---- Office 2010: neutral silver, soft cream hover ---- */
    :host([version="office-2010"]) {
      --bs-ribbon-font-family: "Segoe UI", Calibri, sans-serif;
      --bs-ribbon-container-bg: #F2F4F6;
      --bs-ribbon-container-border: #B8BDC2;
      --bs-ribbon-tabstrip-bg: linear-gradient(#E8ECEF, #D6DBE0);
      --bs-ribbon-tabstrip-border: #B8BDC2;
      --bs-ribbon-tab-idle-color: #2D2D2D;
      --bs-ribbon-tab-hover-bg: linear-gradient(#FFF6D8, #FFEAB0);
      --bs-ribbon-tab-active-bg: #F2F4F6;
      --bs-ribbon-tab-active-color: #2D2D2D;
      --bs-ribbon-tab-active-indicator-color: transparent;
      --bs-ribbon-tab-active-indicator-width: 0px;
      --bs-ribbon-tab-radius: 0;
      --bs-ribbon-tabpanel-bg: #F2F4F6;
      --bs-ribbon-group-separator: #C8CDD2;
      --bs-ribbon-group-separator-inset: 0px;
      --bs-ribbon-group-label-color: #5E6770;
      --bs-ribbon-item-hover-bg: #FFEFB7;
      --bs-ribbon-item-hover-border: #E8C46A;
      --bs-ribbon-item-pressed-bg: #F5DC8A;
      --bs-ribbon-item-radius: 2px;
    }

    /* ---- Office 2013: flat white panel, app-tinted strip ---- */
    :host([version="office-2013"]) {
      --bs-ribbon-app-accent: #2B579A;
      --bs-ribbon-font-family: "Segoe UI", sans-serif;
      --bs-ribbon-container-bg: #FFFFFF;
      --bs-ribbon-container-border: #D2D2D2;
      --bs-ribbon-tabstrip-bg: color-mix(
        in srgb,
        var(--bs-ribbon-app-accent) 18%,
        #FFFFFF
      );
      --bs-ribbon-tabstrip-border: color-mix(
        in srgb,
        var(--bs-ribbon-app-accent) 40%,
        #FFFFFF
      );
      --bs-ribbon-tab-idle-color: #444;
      --bs-ribbon-tab-hover-bg: rgba(0, 0, 0, 0.04);
      --bs-ribbon-tab-active-bg: #FFFFFF;
      --bs-ribbon-tab-active-color: var(--bs-ribbon-app-accent);
      --bs-ribbon-tab-active-indicator-color: transparent;
      --bs-ribbon-tab-active-indicator-width: 0px;
      --bs-ribbon-tab-radius: 0;
      --bs-ribbon-tabpanel-bg: #FFFFFF;
      --bs-ribbon-group-separator: #D2D2D2;
      --bs-ribbon-group-separator-inset: 8px;
      --bs-ribbon-group-label-color: #666;
      --bs-ribbon-item-hover-bg: #EAEAEA;
      --bs-ribbon-item-hover-border: transparent;
      --bs-ribbon-item-pressed-bg: #D6D6D6;
      --bs-ribbon-item-radius: 0;
    }

    /* ---- Office 2016: full app-accent strip, white panel ---- */
    :host([version="office-2016"]) {
      --bs-ribbon-app-accent: #2B579A;
      --bs-ribbon-font-family: "Segoe UI", sans-serif;
      --bs-ribbon-container-bg: #FFFFFF;
      --bs-ribbon-container-border: #D2D2D2;
      --bs-ribbon-tabstrip-bg: var(--bs-ribbon-app-accent);
      --bs-ribbon-tabstrip-border: var(--bs-ribbon-app-accent);
      --bs-ribbon-tab-idle-color: rgba(255, 255, 255, 0.85);
      --bs-ribbon-tab-hover-bg: rgba(255, 255, 255, 0.15);
      --bs-ribbon-tab-active-bg: #FFFFFF;
      --bs-ribbon-tab-active-color: var(--bs-ribbon-app-accent);
      --bs-ribbon-tab-active-indicator-color: var(--bs-ribbon-app-accent);
      --bs-ribbon-tab-active-indicator-width: 2px;
      --bs-ribbon-tab-radius: 0;
      --bs-ribbon-tabpanel-bg: #FFFFFF;
      --bs-ribbon-group-separator: #D2D2D2;
      --bs-ribbon-group-separator-inset: 8px;
      --bs-ribbon-group-label-color: #666;
      --bs-ribbon-item-hover-bg: #E6E6E6;
      --bs-ribbon-item-hover-border: transparent;
      --bs-ribbon-item-pressed-bg: #CCCCCC;
      --bs-ribbon-item-radius: 0;
    }

    .ribbon-container {
      border: 1px solid;
      border-color: var(--bs-ribbon-container-border);
      background: var(--bs-ribbon-container-bg);
      font-family: var(--bs-ribbon-font-family);
    }
    .ribbon-tablist {
      display: flex;
      border-bottom: 1px solid;
      border-bottom-color: var(--bs-ribbon-tabstrip-border);
      background: var(--bs-ribbon-tabstrip-bg);
    }
    .ribbon-tab {
      padding: var(--bs-ribbon-tab-padding);
      background: transparent;
      border: none;
      border-bottom: var(--bs-ribbon-tab-active-indicator-width) solid
        transparent;
      border-radius: var(--bs-ribbon-tab-radius);
      cursor: pointer;
      font-size: 14px;
      color: var(--bs-ribbon-tab-idle-color);
      transition: background 0.15s ease, color 0.15s ease;
    }
    .ribbon-tab:hover { background: var(--bs-ribbon-tab-hover-bg); }
    .ribbon-tab.active {
      background: var(--bs-ribbon-tab-active-bg);
      border-bottom-color: var(--bs-ribbon-tab-active-indicator-color);
      color: var(--bs-ribbon-tab-active-color);
      font-weight: 500;
    }
    .ribbon-tab:focus-visible {
      outline: 2px solid var(--bs-ribbon-app-accent);
      outline-offset: -2px;
    }
    .ribbon-content {
      padding: 0;
      background: var(--bs-ribbon-tabpanel-bg);
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

  /** Visual version theme. */
  @property({ type: String, reflect: true })
  version: 'office-2007' | 'office-2010' | 'office-2013' | 'office-2016' =
    'office-2016';

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
