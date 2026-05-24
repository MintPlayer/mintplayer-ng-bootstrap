import { css, html, LitElement, type TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';

/**
 * mp-quick-access-toolbar — Office-style Quick Access Toolbar (QAT).
 *
 * Sibling element to `mp-ribbon` (intentionally NOT nested — keeps the a11y
 * tree clean: two top-level `role="toolbar"` regions instead of nesting one
 * inside the ribbon's `role="application"`). Consumers wrap both inside
 * their app shell and choose whether to render the QAT above or below the
 * ribbon (Office offers both via "Customize Quick Access Toolbar").
 *
 * Renders a thin horizontal strip with the ribbon's app-accent colours so it
 * sits naturally on top of (or under) the ribbon. Slot accepts the same item
 * elements that the ribbon's groups accept — typically `<bs-ribbon-button>`
 * with `size="small"`.
 *
 * Persistence of which commands are pinned is intentionally NOT in scope —
 * consumers wire localStorage / settings themselves and bind the resulting
 * list to the slot via `*ngFor`.
 */
export class MpQuickAccessToolbar extends LitElement {
  static override styles = css`
    :host {
      display: block;
      color-scheme: light dark;
      --bs-ribbon-app-accent: var(--bs-primary, #0d6efd);
      --bs-ribbon-app-accent-on-dark:
        color-mix(in oklab, var(--bs-ribbon-app-accent) 55%, white 45%);
    }
    .qat {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 2px;
      padding: 2px 6px;
      background: var(--bs-ribbon-tabstrip-bg, var(--bs-ribbon-app-accent));
      border: 1px solid var(--bs-ribbon-tabstrip-border, transparent);
      color: var(--bs-ribbon-tab-idle-color, #fff);
      font-family: var(--bs-ribbon-font-family, inherit);
      font-size: 12px;
      min-height: 28px;
    }
    .qat-label {
      font-size: 11px;
      opacity: 0.75;
      margin-inline-end: 4px;
      white-space: nowrap;
    }
    .qat-divider {
      width: 1px;
      height: 16px;
      background: currentColor;
      opacity: 0.25;
      margin: 0 4px;
    }
    /*
     * The QAT is a horizontal flex row. Item-base WCs default to
     * \`:host { display: inline-flex }\`, but their \`[size="small"]\`
     * variant overrides to \`display: flex; width: 100%\` (intended for
     * vertical stacking inside a ribbon-group column). In the QAT context
     * that's wrong: each button would stretch to fill the toolbar. Reset
     * width here so the QAT keeps its compact horizontal layout regardless
     * of which item element the consumer slots in. The Angular demo
     * doesn't hit this because <bs-ribbon-button> wraps the WC in an
     * inline-flex host, but React/Vue use the WC tags directly.
     */
    ::slotted(mp-ribbon-button[size="small"]),
    ::slotted(mp-ribbon-toggle-button[size="small"]),
    ::slotted(mp-ribbon-dropdown-button[size="small"]),
    ::slotted(mp-ribbon-split-button[size="small"]),
    ::slotted(mp-ribbon-checkbox[size="small"]) {
      width: auto;
    }
    @media (pointer: coarse) {
      :host([touch-mode="auto"]) .qat,
      :host([touch-mode="on"]) .qat {
        min-height: 44px;
      }
    }
    :host([touch-mode="on"]) .qat {
      min-height: 44px;
    }
  `;

  /** ARIA label for the toolbar region. Defaults to "Quick Access Toolbar". */
  @property({ type: String })
  label: string = 'Quick Access Toolbar';

  /**
   * Touch-friendly sizing. Mirrors `mp-ribbon`'s `touch-mode`; consumers
   * typically bind the same value to both for consistency.
   */
  @property({ type: String, attribute: 'touch-mode', reflect: true })
  touchMode: 'on' | 'off' | 'auto' = 'auto';

  override connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'toolbar');
    if (!this.hasAttribute('aria-label')) {
      this.setAttribute('aria-label', this.label);
    }
    this.addEventListener('keydown', this.onKeyDown);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('keydown', this.onKeyDown);
  }

  override updated(changed: Map<string, unknown>): void {
    if (changed.has('label')) {
      this.setAttribute('aria-label', this.label);
    }
  }

  override render(): TemplateResult {
    return html`
      <div class="qat">
        <slot></slot>
      </div>
    `;
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    const { key } = event;
    if (key !== 'ArrowLeft' && key !== 'ArrowRight' && key !== 'Home' && key !== 'End') {
      return;
    }
    const items = this.collectItems();
    if (items.length === 0) return;
    const path = event.composedPath();
    const currentIdx = items.findIndex((item) => path.includes(item));
    // RTL: ArrowLeft moves to the next item (visual direction matches arrow).
    const rtl = getComputedStyle(this).direction === 'rtl';
    const goForward = rtl ? key === 'ArrowLeft' : key === 'ArrowRight';
    const goBackward = rtl ? key === 'ArrowRight' : key === 'ArrowLeft';
    let nextIdx = currentIdx;
    if (goBackward) nextIdx = Math.max(0, currentIdx - 1);
    else if (goForward) nextIdx = Math.min(items.length - 1, currentIdx + 1);
    else if (key === 'Home') nextIdx = 0;
    else if (key === 'End') nextIdx = items.length - 1;
    if (nextIdx !== currentIdx && nextIdx >= 0) {
      items[nextIdx].focus();
      event.preventDefault();
    }
  };

  private collectItems(): HTMLElement[] {
    // Slotted children. Each may be a raw mp-ribbon-* element or an Angular
    // wrapper. Drill in to find the actual focusable Lit element.
    const slot = this.renderRoot.querySelector<HTMLSlotElement>('slot');
    if (!slot) return [];
    const result: HTMLElement[] = [];
    for (const assigned of slot.assignedElements()) {
      const inner = assigned.querySelector<HTMLElement>(
        'mp-ribbon-button, mp-ribbon-toggle-button, mp-ribbon-checkbox, ' +
          'mp-ribbon-split-button, mp-ribbon-dropdown-button'
      );
      const focusable = inner ?? (assigned as HTMLElement);
      if (focusable.tagName.startsWith('MP-RIBBON-') && !focusable.hasAttribute('disabled')) {
        result.push(focusable);
      }
    }
    return result;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('mp-quick-access-toolbar')) {
  customElements.define('mp-quick-access-toolbar', MpQuickAccessToolbar);
}
