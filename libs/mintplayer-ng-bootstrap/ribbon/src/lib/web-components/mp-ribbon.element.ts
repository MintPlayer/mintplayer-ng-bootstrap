import { css, html, LitElement, nothing, type TemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';

interface TabEntry {
  tabId: string;
  label: string;
  element: HTMLElement;
  contextualColor?: string;
  contextualSetLabel?: string;
}

interface ContextualSetEntry {
  label: string;
  color: string;
  tabIds: string[];
}

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
      /* Tell the UA to pick the right scheme for native form controls
         inside the ribbon (selects, color inputs, etc). */
      color-scheme: light dark;
      /* ---- Default tokens (neutral, Bootstrap-anchored) ---- */
      --bs-ribbon-app-accent: var(--bs-primary, #0d6efd);
      --bs-ribbon-app-accent-on-dark:
        color-mix(in oklab, var(--bs-ribbon-app-accent) 55%, white 45%);
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

    /* ============================================================
       DARK MODE
       Two versions ship Microsoft-shipped dark themes:
         office-2013 → "Dark Gray"
         office-2016 → "Black"
       office-2007 / office-2010 keep their existing chrome (those
       versions never had a Microsoft dark mode — documented as a
       no-op on [colorScheme]="dark").
       Each block exists twice: once for explicit [colorScheme]="dark"
       and once under @media (prefers-color-scheme: dark) for
       [colorScheme]="auto" — keeps cascade specificity equal.
       ============================================================ */

    /* Office 2016 — Black */
    :host([color-scheme="dark"][version="office-2016"]) {
      color: rgba(255, 255, 255, 0.87);
      --bs-ribbon-container-bg: #262626;
      --bs-ribbon-container-border: #1A1A1A;
      --bs-ribbon-tabstrip-bg: #1F1F1F;
      --bs-ribbon-tabstrip-border: #1A1A1A;
      --bs-ribbon-tab-idle-color: rgba(255, 255, 255, 0.78);
      --bs-ribbon-tab-hover-bg: #3A3A3A;
      --bs-ribbon-tab-active-bg: #363636;
      --bs-ribbon-tab-active-color: #FFFFFF;
      --bs-ribbon-tab-active-indicator-color: var(--bs-ribbon-app-accent-on-dark);
      --bs-ribbon-tabpanel-bg: #363636;
      --bs-ribbon-group-separator: rgba(255, 255, 255, 0.10);
      --bs-ribbon-group-label-color: rgba(255, 255, 255, 0.60);
      --bs-ribbon-item-hover-bg: #3F3F3F;
      --bs-ribbon-item-hover-border: rgba(255, 255, 255, 0.15);
      --bs-ribbon-item-pressed-bg: #4A4A4A;
    }

    /* Office 2013 — Dark Gray */
    :host([color-scheme="dark"][version="office-2013"]) {
      color: rgba(255, 255, 255, 0.87);
      --bs-ribbon-container-bg: #444444;
      --bs-ribbon-container-border: #2B2B2B;
      --bs-ribbon-tabstrip-bg: #2B2B2B;
      --bs-ribbon-tabstrip-border: #1F1F1F;
      --bs-ribbon-tab-idle-color: rgba(255, 255, 255, 0.70);
      --bs-ribbon-tab-hover-bg: #525252;
      --bs-ribbon-tab-active-bg: #444444;
      --bs-ribbon-tab-active-color: #FFFFFF;
      --bs-ribbon-tab-active-indicator-color: transparent;
      --bs-ribbon-tabpanel-bg: #444444;
      --bs-ribbon-group-separator: rgba(255, 255, 255, 0.08);
      --bs-ribbon-group-label-color: rgba(255, 255, 255, 0.55);
      --bs-ribbon-item-hover-bg: #5A5A5A;
      --bs-ribbon-item-hover-border: transparent;
      --bs-ribbon-item-pressed-bg: #6A6A6A;
    }

    @media (prefers-color-scheme: dark) {
      :host([color-scheme="auto"][version="office-2016"]) {
        color: rgba(255, 255, 255, 0.87);
        --bs-ribbon-container-bg: #262626;
        --bs-ribbon-container-border: #1A1A1A;
        --bs-ribbon-tabstrip-bg: #1F1F1F;
        --bs-ribbon-tabstrip-border: #1A1A1A;
        --bs-ribbon-tab-idle-color: rgba(255, 255, 255, 0.78);
        --bs-ribbon-tab-hover-bg: #3A3A3A;
        --bs-ribbon-tab-active-bg: #363636;
        --bs-ribbon-tab-active-color: #FFFFFF;
        --bs-ribbon-tab-active-indicator-color: var(--bs-ribbon-app-accent-on-dark);
        --bs-ribbon-tabpanel-bg: #363636;
        --bs-ribbon-group-separator: rgba(255, 255, 255, 0.10);
        --bs-ribbon-group-label-color: rgba(255, 255, 255, 0.60);
        --bs-ribbon-item-hover-bg: #3F3F3F;
        --bs-ribbon-item-hover-border: rgba(255, 255, 255, 0.15);
        --bs-ribbon-item-pressed-bg: #4A4A4A;
      }
      :host([color-scheme="auto"][version="office-2013"]) {
        color: rgba(255, 255, 255, 0.87);
        --bs-ribbon-container-bg: #444444;
        --bs-ribbon-container-border: #2B2B2B;
        --bs-ribbon-tabstrip-bg: #2B2B2B;
        --bs-ribbon-tabstrip-border: #1F1F1F;
        --bs-ribbon-tab-idle-color: rgba(255, 255, 255, 0.70);
        --bs-ribbon-tab-hover-bg: #525252;
        --bs-ribbon-tab-active-bg: #444444;
        --bs-ribbon-tab-active-color: #FFFFFF;
        --bs-ribbon-tab-active-indicator-color: transparent;
        --bs-ribbon-tabpanel-bg: #444444;
        --bs-ribbon-group-separator: rgba(255, 255, 255, 0.08);
        --bs-ribbon-group-label-color: rgba(255, 255, 255, 0.55);
        --bs-ribbon-item-hover-bg: #5A5A5A;
        --bs-ribbon-item-hover-border: transparent;
        --bs-ribbon-item-pressed-bg: #6A6A6A;
      }
    }

    /* Contextual band: dark mode bypasses the JS-computed luminance
       text rule. Hue is desaturated + darkened so it doesn't punch
       through dark chrome; text is always white. */
    :host([color-scheme="dark"]) .ribbon-contextual-group-band {
      background: color-mix(
        in oklab,
        var(--bs-ribbon-contextual-color) 40%,
        #1F1F1F 60%
      );
      color: #FFFFFF;
    }
    @media (prefers-color-scheme: dark) {
      :host([color-scheme="auto"]) .ribbon-contextual-group-band {
        background: color-mix(
          in oklab,
          var(--bs-ribbon-contextual-color) 40%,
          #1F1F1F 60%
        );
        color: #FFFFFF;
      }
    }

    .ribbon-container {
      border: 1px solid;
      border-color: var(--bs-ribbon-container-border);
      background: var(--bs-ribbon-container-bg);
      font-family: var(--bs-ribbon-font-family);
    }
    .ribbon-tablist {
      display: flex;
      align-items: flex-end;
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
    .ribbon-contextual-group {
      display: inline-flex;
      flex-direction: column;
      align-self: flex-end;
    }
    .ribbon-contextual-group-band {
      background: var(--bs-ribbon-contextual-color, #F0AF84);
      color: var(--ribbon-contextual-text, #262626);
      font-size: 11px;
      font-weight: 400;
      line-height: 1.3;
      padding: 5px 12px;
      text-align: center;
      white-space: nowrap;
    }
    .ribbon-contextual-group-tabs {
      display: flex;
      flex-direction: row;
      align-self: stretch;
    }
    .ribbon-contextual-group-tabs > .ribbon-tab {
      flex: 1 0 auto;
      text-align: center;
      justify-content: center;
    }
    /* Contextual tabs no longer need a coloured top-border — the band
       directly above them is the visual indicator. Keeping their layout
       identical to plain tabs avoids the colour from the band appearing
       to bleed 3px down into the tab. */
  `;

  /** Currently active tab ID. */
  @property({ type: String, attribute: 'active-tab-id', reflect: true })
  activeTabId: string = '';

  /**
   * Internal list of `<mp-ribbon-tab>` children, populated on slotchange.
   * Source of truth: light-DOM children of this ribbon.
   */
  @state()
  private tabsList: TabEntry[] = [];

  /** Visible contextual tab sets (for the coloured header band). */
  @state()
  private contextualSets: ContextualSetEntry[] = [];

  /** Cached reference to the default slot for re-processing on visibility changes. */
  private contentSlot: HTMLSlotElement | null = null;

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

  /**
   * Light/dark mode. `auto` follows `prefers-color-scheme` and ancestor
   * `data-bs-theme="dark"` (via the Bootstrap fallback variable chain).
   * Explicit `dark` / `light` always overrides those. Dark variants ship
   * for office-2013 (Dark Gray) and office-2016 (Black); on office-2007
   * and office-2010 `dark` is a documented no-op (those versions never
   * had a Microsoft-shipped dark mode).
   */
  @property({ type: String, attribute: 'color-scheme', reflect: true })
  colorScheme: 'light' | 'dark' | 'auto' = 'auto';

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

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.scheduleReflow());
      this.resizeObserver.observe(this);
    }

    this.addEventListener(
      'contextual-visibility-change',
      this.onContextualVisibilityChange
    );
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.resizeObserver?.disconnect();
    if (this.reflowFrame) cancelAnimationFrame(this.reflowFrame);
    this.removeEventListener(
      'contextual-visibility-change',
      this.onContextualVisibilityChange
    );
  }

  private onContextualVisibilityChange = (): void => {
    if (this.contentSlot) this.processSlot(this.contentSlot);
  };

  override updated(changed: Map<string, unknown>): void {
    if (changed.has('activeTabId')) {
      this.applyActiveAttribute();
    }
    if (changed.has('activeTabId') || changed.has('minimized')) {
      this.scheduleReflow();
    }
  }

  override render(): TemplateResult {
    return html`
      <div class="ribbon-container">
        <div
          role="tablist"
          class="ribbon-tablist"
          @keydown="${this.onTabListKeydown}"
        >
          ${this.renderTabStripItems()}
        </div>

        ${!this.minimized
          ? html`<div class="ribbon-content">
              <slot @slotchange="${this.onSlotChange}"></slot>
            </div>`
          : html`<div hidden><slot @slotchange="${this.onSlotChange}"></slot></div>`}
      </div>
    `;
  }

  private renderTabStripItems(): TemplateResult[] {
    const result: TemplateResult[] = [];
    let i = 0;
    while (i < this.tabsList.length) {
      const tab = this.tabsList[i];
      if (!tab.contextualColor || !tab.contextualSetLabel) {
        result.push(this.renderTabButton(tab, i));
        i++;
        continue;
      }
      const setLabel = tab.contextualSetLabel;
      const setColor = tab.contextualColor;
      const runStart = i;
      while (
        i < this.tabsList.length &&
        this.tabsList[i].contextualSetLabel === setLabel &&
        this.tabsList[i].contextualColor === setColor
      ) {
        i++;
      }
      const groupTabs = this.tabsList.slice(runStart, i);
      const textColor = this.getBandTextColor(setColor);
      const wrapperStyle =
        `--bs-ribbon-contextual-color: ${setColor};` +
        `--ribbon-contextual-text: ${textColor};`;
      result.push(html`
        <div class="ribbon-contextual-group" style="${wrapperStyle}">
          <div class="ribbon-contextual-group-band">${setLabel}</div>
          <div class="ribbon-contextual-group-tabs">
            ${groupTabs.map((t, idx) =>
              this.renderTabButton(t, runStart + idx)
            )}
          </div>
        </div>
      `);
    }
    return result;
  }

  /**
   * Office-faithful contrast rule: dark text on pastel bands, white text on
   * saturated bands. Uses W3C relative luminance with a 0.6 cutoff. Accepts
   * 6-digit hex; falls back to dark on parse failure (safe default).
   */
  private getBandTextColor(bg: string): string {
    const hex = bg.replace('#', '').trim();
    if (hex.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(hex)) return '#262626';
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return luminance >= 0.6 ? '#262626' : '#FFFFFF';
  }

  private renderTabButton(tab: TabEntry, _index: number): TemplateResult {
    const isActive = tab.tabId === this.activeTabId;
    const isContextual = !!tab.contextualColor;
    const tabIndex = isActive ? 0 : -1;

    return html`
      <button
        role="tab"
        id="ribbon-tab-${tab.tabId}"
        class="ribbon-tab ${isActive ? 'active' : ''} ${isContextual ? 'contextual' : ''}"
        aria-selected="${isActive}"
        aria-controls="ribbon-panel-${tab.tabId}"
        tabindex="${tabIndex}"
        data-tab-id="${tab.tabId}"
        @click="${() => this.selectTab(tab.tabId)}"
      >${tab.label}</button>
    `;
  }

  private onSlotChange = (event: Event): void => {
    const slot = event.target as HTMLSlotElement;
    this.contentSlot = slot;
    this.processSlot(slot);
  };

  private processSlot(slot: HTMLSlotElement): void {
    const newTabs: TabEntry[] = [];
    const newSets: ContextualSetEntry[] = [];

    for (const assigned of slot.assignedElements()) {
      // Contextual set (or Angular wrapper around one)
      let setEl: HTMLElement | null = null;
      if (assigned.tagName === 'MP-RIBBON-CONTEXTUAL-TAB-SET') {
        setEl = assigned as HTMLElement;
      } else {
        setEl = assigned.querySelector<HTMLElement>(
          'mp-ribbon-contextual-tab-set'
        );
      }
      if (setEl) {
        const isHidden =
          setEl.hasAttribute('hidden') || assigned.hasAttribute('hidden');
        if (isHidden) continue;
        const color = setEl.getAttribute('color') ?? '#5BAEFF';
        const label = setEl.getAttribute('label') ?? '';
        const innerTabs = Array.from(
          setEl.querySelectorAll<HTMLElement>('mp-ribbon-tab')
        );
        const tabIds: string[] = [];
        for (const tab of innerTabs) {
          const id = tab.getAttribute('tab-id') ?? '';
          newTabs.push({
            tabId: id,
            label: tab.getAttribute('label') ?? '',
            element: tab,
            contextualColor: color,
            contextualSetLabel: label,
          });
          tabIds.push(id);
        }
        if (tabIds.length > 0) newSets.push({ label, color, tabIds });
        continue;
      }

      // Plain tab (or Angular wrapper)
      let tabEl: HTMLElement | null = null;
      if (assigned.tagName === 'MP-RIBBON-TAB') {
        tabEl = assigned as HTMLElement;
      } else {
        tabEl = assigned.querySelector<HTMLElement>('mp-ribbon-tab');
      }
      if (tabEl) {
        newTabs.push({
          tabId: tabEl.getAttribute('tab-id') ?? '',
          label: tabEl.getAttribute('label') ?? '',
          element: tabEl,
        });
      }
    }

    this.tabsList = newTabs;
    this.contextualSets = newSets;

    // If the active tab vanished (e.g. its contextual set was hidden), pick
    // the first visible one.
    const stillVisible = newTabs.some((t) => t.tabId === this.activeTabId);
    if (!stillVisible && newTabs.length > 0) {
      this.activeTabId = newTabs[0].tabId;
    } else if (!this.activeTabId && newTabs.length > 0) {
      this.activeTabId = newTabs[0].tabId;
    }
    this.applyActiveAttribute();
    this.scheduleReflow();
  }

  private applyActiveAttribute(): void {
    for (const tab of this.tabsList) {
      if (tab.tabId === this.activeTabId) {
        tab.element.setAttribute('active', '');
      } else {
        tab.element.removeAttribute('active');
      }
    }
  }

  private selectTab(tabId: string): void {
    const previousTabId = this.activeTabId;
    this.activeTabId = tabId;
    const tabIndex = this.tabsList.findIndex((t) => t.tabId === tabId);
    if (tabIndex !== -1) {
      this.currentTabIndex = tabIndex;
    }
    this.dispatchEvent(
      new CustomEvent('tab-change', {
        detail: { previousTabId, activeTabId: tabId },
        bubbles: true,
        composed: true,
      })
    );
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
        this.focusTabAt(this.tabsList.length - 1);
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
    const newIndex = Math.min(this.tabsList.length - 1, this.currentTabIndex + 1);
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
    const activeTab = this.tabsList.find((t) => t.tabId === this.activeTabId);
    if (!activeTab) return;
    const panel = activeTab.element;

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
   * `display: contents` host). The slot lives in `mp-ribbon-tab`'s shadow
   * root since each tab owns its own default slot.
   */
  private collectActiveGroups(panel: HTMLElement): HTMLElement[] {
    const slot = panel.shadowRoot?.querySelector<HTMLSlotElement>('slot');
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
