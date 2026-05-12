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
    }
    .ribbon-panel[hidden] { display: none; }
    .ribbon-panel {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: stretch;
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
}

if (typeof customElements !== 'undefined' && !customElements.get('mp-ribbon')) {
  customElements.define('mp-ribbon', MpRibbon);
}
