import { css, html, LitElement, nothing, type TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { OverlayController } from '@mintplayer/web-components/overlay';

export interface RibbonGroup {
  id: string;
  label: string;
}

export class MpRibbonGroup extends LitElement {
  static override styles = css`
    :host { display: inline-flex; position: relative; }
    :host::after {
      content: '';
      position: absolute;
      top: var(--bs-ribbon-group-separator-inset, 0px);
      bottom: var(--bs-ribbon-group-separator-inset, 0px);
      inset-inline-end: 0;
      width: 1px;
      background: var(--bs-ribbon-group-separator, rgba(0, 0, 0, 0.12));
      pointer-events: none;
    }
    :host([data-resolved-size="popup"])::after {
      top: var(--bs-ribbon-group-separator-inset, 0px);
      bottom: var(--bs-ribbon-group-separator-inset, 0px);
    }
    .ribbon-group {
      display: flex;
      flex-direction: column;
      padding: 2px 6px 0;
      min-width: 64px;
    }
    .ribbon-group-items {
      display: grid;
      grid-template-rows: repeat(3, auto);
      grid-auto-flow: column;
      column-gap: 4px;
      row-gap: 0;
      align-items: center;
      flex: 1;
    }
    ::slotted([size="large"]),
    ::slotted([size="medium"]) {
      grid-row: 1 / -1;
      align-self: stretch;
      justify-self: center;
    }
    ::slotted([size="small"]) {
      grid-row: span 1;
      align-self: center;
      justify-self: stretch;
      width: 100%;
      display: flex;
    }
    .ribbon-group-footer {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 2px;
      padding: 2px 0;
      position: relative;
    }
    .ribbon-group-label {
      font-size: 11px;
      line-height: 1;
      color: var(--bs-ribbon-group-label-color, #6c757d);
    }
    .ribbon-dialog-launcher {
      position: absolute;
      inset-inline-end: 0;
      background: transparent;
      border: none;
      cursor: pointer;
      padding: 0 2px;
      font-size: 11px;
      line-height: 1;
      color: var(--bs-ribbon-group-label-color, #6c757d);
    }
    .ribbon-dialog-launcher:hover {
      color: var(--bs-ribbon-app-accent, #0d6efd);
    }

    .ribbon-popup-trigger {
      display: none;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      background: transparent;
      border: 1px solid transparent;
      border-radius: var(--bs-ribbon-item-radius, 3px);
      cursor: pointer;
      padding: 6px 10px;
      min-width: 56px;
      font-size: 12px;
      color: inherit;
    }
    .ribbon-popup-trigger:hover {
      background: var(--bs-ribbon-item-hover-bg, #e9ecef);
      border-color: var(--bs-ribbon-item-hover-border, #ced4da);
    }
    .ribbon-popup-trigger:focus-visible {
      outline: 2px solid var(--bs-ribbon-app-accent, #0d6efd);
      outline-offset: -2px;
    }
    .ribbon-popup-trigger-icon { font-size: 22px; line-height: 1; }
    .ribbon-popup-trigger-label {
      display: flex;
      align-items: center;
      gap: 2px;
      white-space: nowrap;
    }
    .ribbon-popup-trigger-chevron { font-size: 9px; opacity: 0.6; }

    :host([data-resolved-size="popup"]) .ribbon-group { display: none; }
    :host([data-resolved-size="popup"]) .ribbon-popup-trigger { display: flex; }
    :host([data-resolved-size="popup"][data-menu-open]) .ribbon-group {
      display: flex;
      position: fixed;
      background: var(--bs-ribbon-tabpanel-bg, #fff);
      border: 1px solid var(--bs-ribbon-container-border, #d0d0d0);
      border-radius: 4px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18);
      padding: 4px 6px;
      z-index: 1050;
      min-width: 200px;
      max-width: calc(100vw - 16px);
    }

    /* ============================================================
       SIMPLIFIED LAYOUT (FR-39)
       Groups become flat horizontal flex rows; the 3-row grid is
       dropped, the label + dialog launcher footer is hidden, and
       per-group popup-chunk collapse is suppressed (the shared
       end-of-tab chevron on mp-ribbon-tab takes over). Items handle
       their own simplified rendering via the same data attribute.
       The separator hairline is also hidden — Simplified relies on
       padding alone for visual separation between groups.
       ============================================================ */
    :host([data-ribbon-layout="simplified"])::after {
      display: none;
    }
    :host([data-ribbon-layout="simplified"]) .ribbon-group {
      flex-direction: row;
      align-items: center;
      padding: 4px 8px;
      min-width: 0;
      min-height: 36px;
    }
    :host([data-ribbon-layout="simplified"]) .ribbon-group-items {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 2px;
      flex: 0 0 auto;
    }
    :host([data-ribbon-layout="simplified"]) .ribbon-group-footer {
      display: none;
    }
    /* Override the 3-row grid placement for slotted items. */
    :host([data-ribbon-layout="simplified"]) ::slotted([size="large"]),
    :host([data-ribbon-layout="simplified"]) ::slotted([size="medium"]),
    :host([data-ribbon-layout="simplified"]) ::slotted([size="small"]) {
      grid-row: auto;
      grid-column: auto;
      align-self: center;
      justify-self: auto;
      width: auto;
      display: inline-flex;
    }
    /* Suppress per-group popup-chunk in Simplified — the shared end-of-tab
       chevron is the overflow story. */
    :host([data-ribbon-layout="simplified"]) .ribbon-popup-trigger {
      display: none !important;
    }
    :host([data-ribbon-layout="simplified"]) .ribbon-group {
      display: flex !important;
    }
  `;

  @property({ type: String, attribute: 'group-id', reflect: true })
  groupId: string = '';

  @property({ type: String })
  label: string = '';

  @property({ type: String })
  icon: string = '';

  @property({ type: String, attribute: 'dialog-launcher' })
  dialogLauncher: string = '';

  @property({ type: String, attribute: 'data-resolved-size', reflect: true })
  resolvedSize: 'large' | 'medium' | 'small' | 'popup' | '' = '';

  /**
   * Group priority hint (FR-23). Lower priority collapses first; higher
   * priority stays visible longer. When omitted, all groups tie at 0 and
   * the reflow falls back to DOM-order (rightmost-first), matching the
   * pre-priority behaviour. Range / sign is consumer-defined; the reflow
   * only compares values.
   */
  @property({ type: Number, reflect: true })
  priority: number = 0;

  /**
   * `false` opts this group out of automatic ReduceOrder collapse — it will
   * never resolve to `popup`. The ribbon's narrow layout then falls back to
   * horizontal scrolling. Mirrors Office's `autoScale=false` semantic.
   */
  @property({ type: String, attribute: 'auto-scale', reflect: true })
  autoScale: 'true' | 'false' = 'true';

  /**
   * Scroll-aware overlay for the group's collapsed popup. `stickyOnAnchorOffscreen`
   * keeps the popup interactive when the user scrolls the ribbon tab strip
   * past the viewport top — the popup stays pinned at the top edge instead
   * of disappearing with its trigger.
   */
  private readonly overlay = new OverlayController(this, {
    anchor: () => this.renderRoot.querySelector<HTMLElement>('.ribbon-popup-trigger'),
    panel: () => this.renderRoot.querySelector<HTMLElement>('.ribbon-group'),
    stickyOnAnchorOffscreen: true,
    onOpen: async () => {
      // Move focus into the popup so keyboard users can reach items.
      await this.updateComplete;
      const first = this.collectItems()[0];
      first?.focus();
    },
  });

  /**
   * Selector for focusable item hosts inside this group. Matches every kind
   * that extends `MpRibbonItemBase` (all of which get `delegatesFocus: true`
   * via the base class) so setting `tabindex` on the host controls whether
   * the whole item is reachable via Tab.
   */
  private static readonly ITEM_SELECTOR =
    'mp-ribbon-button, mp-ribbon-toggle-button, mp-ribbon-checkbox, ' +
    'mp-ribbon-combobox, mp-ribbon-color-picker, mp-ribbon-group-button, ' +
    'mp-ribbon-split-button, mp-ribbon-dropdown-button, mp-ribbon-gallery';

  private slotObserver?: MutationObserver;

  override connectedCallback() {
    super.connectedCallback();
    this.addEventListener('focusin', this.onFocusIn);
    this.addEventListener('keydown', this.onGroupKeyDown);
    // Light-DOM children may arrive after connectedCallback (Angular renders
    // its wrappers asynchronously). Watch for changes and re-apply tabindex.
    this.slotObserver = new MutationObserver(() => this.applyRovingTabindex());
    this.slotObserver.observe(this, { childList: true, subtree: true });
    // Initial pass (deferred so children that haven't been parsed yet land).
    Promise.resolve().then(() => this.applyRovingTabindex());
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('focusin', this.onFocusIn);
    this.removeEventListener('keydown', this.onGroupKeyDown);
    this.slotObserver?.disconnect();
    this.slotObserver = undefined;
  }

  /**
   * Roving tabindex (APG toolbar pattern). The first non-disabled item gets
   * `tabindex="0"`; the rest get `tabindex="-1"`. When focus moves between
   * items, `onFocusIn` updates which item is currently tabbable so that Tab
   * away + Tab back returns focus to the last visited item in this group.
   */
  private applyRovingTabindex(): void {
    const items = this.collectItems();
    if (items.length === 0) return;
    // If one already has tabindex="0", keep it; otherwise promote the first.
    let active = items.find((item) => item.getAttribute('tabindex') === '0');
    if (!active) active = items[0];
    for (const item of items) {
      item.setAttribute('tabindex', item === active ? '0' : '-1');
    }
  }

  private collectItems(): HTMLElement[] {
    return Array.from(
      this.querySelectorAll<HTMLElement>(MpRibbonGroup.ITEM_SELECTOR)
    ).filter((item) => !item.hasAttribute('disabled'));
  }

  private onFocusIn = (event: FocusEvent): void => {
    const target = event.target as Element | null;
    if (!target) return;
    // `target` may be the inner shadow-DOM button (event retargeting against
    // the closed-ish-but-actually-open shadow boundary). Walk back up via
    // composedPath to find the focusable item host.
    const path = event.composedPath();
    const focusedItem = path.find(
      (n) =>
        n instanceof HTMLElement &&
        n.matches(MpRibbonGroup.ITEM_SELECTOR) &&
        this.contains(n)
    ) as HTMLElement | undefined;
    if (!focusedItem) return;
    for (const item of this.collectItems()) {
      item.setAttribute('tabindex', item === focusedItem ? '0' : '-1');
    }
  };

  private onGroupKeyDown = (event: KeyboardEvent): void => {
    // Ignore arrows that other handlers own:
    // - Ctrl+ArrowLeft/Right is the ribbon's group-jump (FR-14).
    // - ArrowDown is the dropdown/split trigger's "open menu" (FR-28).
    if (event.ctrlKey || event.altKey || event.shiftKey || event.metaKey) return;
    const { key } = event;
    if (key !== 'ArrowLeft' && key !== 'ArrowRight' && key !== 'Home' && key !== 'End') {
      return;
    }

    const path = event.composedPath();

    // Skip when focus is inside a native form control — `<select>` cycles
    // options on Left/Right when collapsed, `<input>` moves the caret, etc.
    // The user Tabs out of these to reach the next item.
    const innermost = path[0] as HTMLElement | undefined;
    if (innermost && innermost instanceof HTMLElement) {
      const tag = innermost.tagName;
      if (tag === 'SELECT' || tag === 'INPUT' || tag === 'TEXTAREA') return;
    }
    // Skip when focus is inside a gallery — the gallery owns its own grid nav
    // among its items. Roving across groups uses Ctrl+ArrowLeft/Right instead.
    if (path.some((n) => n instanceof HTMLElement && n.tagName === 'MP-RIBBON-GALLERY')) {
      return;
    }

    const items = this.collectItems();
    if (items.length === 0) return;

    const currentItem = path.find(
      (n) =>
        n instanceof HTMLElement && items.includes(n as HTMLElement)
    ) as HTMLElement | undefined;
    const currentIdx = currentItem ? items.indexOf(currentItem) : -1;

    // In RTL, ArrowLeft visually moves to the next item (DOM-order next),
    // matching the APG "arrow points the direction you go" rule.
    const rtl = getComputedStyle(this).direction === 'rtl';
    const goForward = rtl ? key === 'ArrowLeft' : key === 'ArrowRight';
    const goBackward = rtl ? key === 'ArrowRight' : key === 'ArrowLeft';

    let nextIdx = currentIdx;
    if (goBackward) nextIdx = currentIdx <= 0 ? items.length - 1 : currentIdx - 1;
    else if (goForward) nextIdx = currentIdx >= items.length - 1 ? 0 : currentIdx + 1;
    else if (key === 'Home') nextIdx = 0;
    else if (key === 'End') nextIdx = items.length - 1;

    if (nextIdx !== currentIdx && nextIdx >= 0) {
      items[nextIdx].focus();
      event.preventDefault();
    }
  };

  override updated(changed: Map<string, unknown>): void {
    if (changed.has('resolvedSize') && this.resolvedSize !== 'popup') {
      // If the group expanded back, ensure the popup is closed. Don't return
      // focus to the trigger — it's `display: none` once the group is
      // expanded, so the focus call would fail silently and confuse the user.
      if (this.overlay.isOpen) this.overlay.close(false);
    }
  }

  override render(): TemplateResult {
    return html`
      <div
        class="ribbon-group"
        role="toolbar"
        aria-label="${this.label}"
      >
        <div class="ribbon-group-items">
          <slot></slot>
        </div>
        <div class="ribbon-group-footer">
          <span class="ribbon-group-label">${this.label}</span>
          ${this.dialogLauncher
            ? html`<button
                class="ribbon-dialog-launcher"
                title="${this.dialogLauncher}"
                aria-label="${this.dialogLauncher}"
                @click="${this.onDialogLauncherClick}"
              >⬘</button>`
            : nothing}
        </div>
      </div>
      <button
        class="ribbon-popup-trigger"
        aria-haspopup="true"
        aria-expanded="${this.overlay.isOpen}"
        aria-label="${this.label}"
        title="${this.label}"
        @click="${this.onTriggerClick}"
        @keydown="${this.onTriggerKeyDown}"
      >
        ${this.icon
          ? html`<span class="ribbon-popup-trigger-icon">${this.icon}</span>`
          : nothing}
        <span class="ribbon-popup-trigger-label">
          ${this.label}
          <span class="ribbon-popup-trigger-chevron">▼</span>
        </span>
      </button>
    `;
  }

  private onTriggerClick = async (event: MouseEvent): Promise<void> => {
    event.stopPropagation();
    await this.overlay.toggle();
  };

  private onTriggerKeyDown = async (event: KeyboardEvent): Promise<void> => {
    // ArrowDown opens the popup without activating the trigger (matches
    // `mp-ribbon-dropdown-button`'s trigger + Office collapsed-group). Enter
    // and Space go through the click handler via native button semantics.
    if (event.key === 'ArrowDown' && !this.overlay.isOpen) {
      event.preventDefault();
      await this.overlay.open();
    }
  };

  private onDialogLauncherClick(): void {
    this.dispatchEvent(
      new CustomEvent('dialog-launcher-click', {
        detail: { groupId: this.groupId },
        bubbles: true,
        composed: true,
      })
    );
  }
}

customElements.define('mp-ribbon-group', MpRibbonGroup);
