import { adoptStyles, LitElement, html, type TemplateResult } from 'lit';
import { OverlayController, type OverlayPosition } from '@mintplayer/web-components/overlay';
import { dropdownStyles } from '../styles';
import type { DropdownToggleEventDetail } from '../types';

// Float below the trigger; flip above on overflow.
const POSITIONS_BELOW: OverlayPosition[] = [
  { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top' },
  { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom' },
];
// Nested submenu: open to the right; flip left on overflow. offsetX -1 overlaps
// the submenu ~1px onto the parent so the submenu's (kept) leading border renders
// OVER the parent's solid body — a visible divider line — with no page bleeding
// through the borders' translucency (which a 0/positive offset would leave).
const POSITIONS_SIDE: OverlayPosition[] = [
  { originX: 'end', originY: 'top', overlayX: 'start', overlayY: 'top', offsetX: -1 },
  { originX: 'start', originY: 'top', overlayX: 'end', overlayY: 'top', offsetX: 1 },
];

/**
 * `<mp-dropdown>` — a framework-agnostic, reusable dropdown. Not navbar-specific:
 * it replaces `bs-dropdown-menu`/`bs-dropdown-item` and is also consumed by
 * `<mp-navbar>`. Two tiers, like the rest of the catalog:
 *
 *  - **No-JS** — a native `<details>`/`<summary>` toggle. Works with JavaScript
 *    disabled when server-rendered as Declarative Shadow DOM. Placement is the
 *    `--mp-dropdown-position` lever (inherits across the shadow boundary):
 *    unset/`absolute` floats below the trigger; `static` expands inline (the
 *    navbar sets this in its collapsed/mobile mode, so this element stays
 *    navbar-agnostic).
 *  - **Hydrated** — `<details>` stays the source of open/closed truth (its
 *    `toggle` event drives everything); on open, unless placement is inline,
 *    {@link OverlayController} repositions the same panel as a `position:fixed`
 *    overlay with viewport flip (nested submenus open to the side), plus
 *    Esc-stack and outside-click close.
 *
 *      <mp-dropdown>
 *        <span slot="trigger">Menu</span>
 *        <a href="/a">Item A</a>
 *        <a href="/b">Item B</a>
 *      </mp-dropdown>
 *
 * Trigger appearance (nav-link vs `.btn`) is the consumer's via `::part(trigger)`.
 */
export class MpDropdown extends LitElement {
  static override styles = [dropdownStyles];

  static override get observedAttributes(): string[] {
    return [...(super.observedAttributes ?? []), 'autoclose'];
  }

  private overlay: OverlayController | null = null;
  private detailsEl: HTMLDetailsElement | null = null;
  private triggerEl: HTMLElement | null = null;
  private menuEl: HTMLElement | null = null;
  /** True when this dropdown is nested inside another dropdown's menu. */
  private isNested = false;

  /** Whether selecting an item (or clicking outside) closes the dropdown. */
  get autoclose(): boolean {
    return !this.hasAttribute('autoclose') || this.getAttribute('autoclose') !== 'false';
  }
  set autoclose(v: boolean) {
    if (v === false) this.setAttribute('autoclose', 'false');
    else this.removeAttribute('autoclose');
  }

  /** Whether the dropdown is currently open (reflects `<details open>`). */
  get open(): boolean {
    return this.detailsEl?.open ?? false;
  }
  set open(v: boolean) {
    if (this.detailsEl) this.detailsEl.open = v;
  }

  protected override createRenderRoot(): HTMLElement | DocumentFragment {
    // The DSD chrome is static and matches render(), but mirror the carousel's
    // unconditional destructive take-over: discard the inert SSR chrome and
    // adopt styles ourselves so the first client render is styled in every
    // framework (the @lit-labs/ssr-client shim otherwise returns the shadow
    // root without adopting styles). Slotted items are light DOM, untouched.
    const ctor = this.constructor as typeof MpDropdown;
    const root = this.shadowRoot ?? this.attachShadow(ctor.shadowRootOptions);
    root.replaceChildren();
    adoptStyles(root, ctor.elementStyles);
    return root;
  }

  override firstUpdated(): void {
    const root = this.shadowRoot!;
    this.detailsEl = root.querySelector('details');
    this.triggerEl = root.querySelector('summary');
    this.menuEl = root.querySelector('.dropdown-menu');
    // Nesting: a dropdown slotted into another dropdown's menu is a light-DOM
    // descendant of it. `closest` from the parent finds the enclosing dropdown.
    this.isNested = !!this.parentElement?.closest('mp-dropdown');
    // Reflect nesting so a side-positioned submenu drops its leading border +
    // squares its leading corners, joining the parent with a single divider.
    if (this.isNested) this.setAttribute('nested', '');

    this.overlay = new OverlayController(this, {
      anchor: () => this.triggerEl,
      panel: () => this.menuEl,
      trigger: () => this.triggerEl,
      positions: this.isNested ? POSITIONS_SIDE : POSITIONS_BELOW,
      scrollStrategy: 'reposition',
      onClose: () => {
        // Outside-click / Esc closed the overlay → reflect into <details>.
        if (this.detailsEl?.open) this.detailsEl.open = false;
      },
    });

    this.detailsEl?.addEventListener('toggle', this.onToggle);
    this.addEventListener('click', this.onItemClick);
  }

  override disconnectedCallback(): void {
    this.detailsEl?.removeEventListener('toggle', this.onToggle);
    this.removeEventListener('click', this.onItemClick);
    super.disconnectedCallback();
  }

  /** True while placement resolves to inline (the navbar's collapsed mode). */
  private placementIsInline(): boolean {
    return getComputedStyle(this).getPropertyValue('--mp-dropdown-position').trim() === 'static';
  }

  private onToggle = (): void => {
    const open = this.detailsEl?.open ?? false;
    if (this.triggerEl) this.triggerEl.setAttribute('aria-expanded', String(open));
    if (open) {
      // Inline mode: let <details> expand in flow (no overlay positioning).
      if (!this.placementIsInline()) this.overlay?.open();
    } else {
      this.overlay?.close(false);
    }
    this.dispatchEvent(
      new CustomEvent<DropdownToggleEventDetail>('toggle-change', {
        detail: { open },
        bubbles: true,
        composed: true,
      }),
    );
  };

  private onItemClick = (ev: MouseEvent): void => {
    if (!this.autoclose) return;
    const item = (ev.target as Element | null)?.closest('a,button');
    if (!item) return;
    // Ignore clicks that belong to a nested dropdown's trigger/items — that
    // dropdown's own listener handles them.
    if ((ev.target as Element).closest('mp-dropdown') !== this) return;
    if (this.detailsEl?.open) this.detailsEl.open = false;
  };

  override render(): TemplateResult {
    return html`
      <details>
        <summary part="trigger" aria-haspopup="true" aria-expanded="false">
          <slot name="trigger"></slot>
        </summary>
        <div class="dropdown-menu" part="menu" role="menu">
          <slot></slot>
        </div>
      </details>
    `;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('mp-dropdown')) {
  customElements.define('mp-dropdown', MpDropdown);
}
