import { css, html, LitElement, nothing, type TemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';
import { OverlayController } from './overlay-controller';

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
    :host([data-resolved-size="popup"][data-popup-open]) .ribbon-group {
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
  `;

  @property({ type: String, attribute: 'group-id' })
  groupId: string = '';

  @property({ type: String })
  label: string = '';

  @property({ type: String })
  icon: string = '';

  @property({ type: String, attribute: 'dialog-launcher' })
  dialogLauncher: string = '';

  @property({ type: String, attribute: 'data-resolved-size', reflect: true })
  resolvedSize: 'large' | 'medium' | 'small' | 'popup' | '' = '';

  @state()
  private popupOpen = false;

  @state()
  private popupLeft = 0;

  @state()
  private popupTop = 0;

  /** Token held while this group's popup is on the shared overlay stack. */
  private popupStackToken: symbol | null = null;

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
    document.addEventListener('keydown', this.onKeyDown);
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
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('mousedown', this.onDocMouseDown, true);
    this.removeEventListener('focusin', this.onFocusIn);
    this.removeEventListener('keydown', this.onGroupKeyDown);
    this.slotObserver?.disconnect();
    this.slotObserver = undefined;
    if (this.popupStackToken) {
      OverlayController.releaseFrame(this.popupStackToken);
      this.popupStackToken = null;
    }
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
      if (this.popupOpen) this.closePopup(false);
    }
  }

  override render(): TemplateResult {
    const popupStyles = this.popupOpen
      ? { left: `${this.popupLeft}px`, top: `${this.popupTop}px` }
      : {};
    return html`
      <div
        class="ribbon-group"
        role="toolbar"
        aria-label="${this.label}"
        style=${styleMap(popupStyles)}
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
        aria-expanded="${this.popupOpen}"
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

  private onTriggerClick = (event: MouseEvent): void => {
    event.stopPropagation();
    if (this.popupOpen) {
      this.closePopup();
    } else {
      this.openPopup();
    }
  };

  private onTriggerKeyDown = (event: KeyboardEvent): void => {
    // ArrowDown / Alt+ArrowDown open the popup without activating the trigger
    // (matches `mp-ribbon-dropdown-button`'s trigger and Office's collapsed
    // group). Enter / Space go through the click handler via native button
    // semantics, so we don't need to handle them here.
    if (event.key === 'ArrowDown' && !this.popupOpen) {
      event.preventDefault();
      this.openPopup();
    }
  };

  private async openPopup(): Promise<void> {
    this.popupOpen = true;
    this.popupStackToken = OverlayController.pushFrame();
    this.setAttribute('data-popup-open', '');
    await this.updateComplete;
    this.positionPopup();
    // Defer so the click that opened the popup doesn't immediately close it.
    setTimeout(() => {
      document.addEventListener('mousedown', this.onDocMouseDown, true);
    }, 0);
    // Move focus into the popup so keyboard users can reach the items inside
    // — Office-faithful and matches the APG "disclosure / menu" pattern. The
    // popup's items use delegatesFocus on their host so .focus() forwards into
    // the inner shadow-root button.
    const first = this.collectItems()[0];
    first?.focus();
  }

  private closePopup(returnFocus = true): void {
    if (!this.popupOpen) return;
    this.popupOpen = false;
    if (this.popupStackToken) {
      OverlayController.releaseFrame(this.popupStackToken);
      this.popupStackToken = null;
    }
    this.removeAttribute('data-popup-open');
    document.removeEventListener('mousedown', this.onDocMouseDown, true);
    if (returnFocus) {
      const trigger = this.renderRoot.querySelector<HTMLElement>(
        '.ribbon-popup-trigger'
      );
      trigger?.focus();
    }
  }

  private positionPopup(): void {
    const trigger = this.renderRoot.querySelector<HTMLElement>(
      '.ribbon-popup-trigger'
    );
    const group = this.renderRoot.querySelector<HTMLElement>('.ribbon-group');
    if (!trigger || !group) return;

    const triggerRect = trigger.getBoundingClientRect();
    const groupRect = group.getBoundingClientRect();
    const vw = window.innerWidth;
    const margin = 8;

    let left = triggerRect.left;
    if (left + groupRect.width > vw - margin) {
      left = vw - groupRect.width - margin;
    }
    if (left < margin) left = margin;

    const top = triggerRect.bottom + 4;

    this.popupLeft = left;
    this.popupTop = top;
  }

  private onDocMouseDown = (event: MouseEvent): void => {
    const path = event.composedPath();
    if (path.includes(this)) return;
    // User clicked outside — leave focus wherever the click landed, don't
    // yank it back to the trigger.
    this.closePopup(false);
  };

  private onKeyDown = (event: KeyboardEvent): void => {
    if (
      event.key === 'Escape' &&
      this.popupOpen &&
      this.popupStackToken !== null &&
      OverlayController.isFrameTop(this.popupStackToken)
    ) {
      this.closePopup();
      event.preventDefault();
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
