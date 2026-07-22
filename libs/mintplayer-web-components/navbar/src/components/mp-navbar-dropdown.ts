import { html } from 'lit';
import { OverlayController } from '@mintplayer/web-components/overlay';
import { MpNavbarElement } from './mp-navbar-element';
import { navbarDropdownStyles } from '../styles';

/**
 * `<mp-navbar-dropdown>` — a navbar entry that opens a dropdown. Slot the
 * trigger label into `slot="label"` and an `<mp-dropdown-menu>` as the default
 * content (the panel). Nest one inside a dropdown item to make a submenu.
 *
 *     <mp-navbar-dropdown>
 *       <span slot="label">Products</span>
 *       <mp-dropdown-menu>
 *         <mp-dropdown-item><a href="/p1">Product 1</a></mp-dropdown-item>
 *         <mp-navbar-dropdown>              <!-- submenu -->
 *           <span slot="label">More</span>
 *           <mp-dropdown-menu>…</mp-dropdown-menu>
 *         </mp-navbar-dropdown>
 *       </mp-dropdown-menu>
 *     </mp-navbar-dropdown>
 *
 * Reveal (see navbar-dropdown.styles.scss): no-JS uses `:focus-within`; once
 * `connectedCallback` sets `data-js`, only clicks control visibility. A
 * first-level panel is positioned + height-capped in CSS. A **submenu** renders
 * inline within its parent with no JS, and — with JS — opens as a fixed overlay
 * positioned to the side by the shared `OverlayController`.
 */
export class MpNavbarDropdown extends MpNavbarElement {
  static override styles = [navbarDropdownStyles];

  static override get observedAttributes(): string[] {
    // `data-open` (inline) / `data-menu-open` (OverlayController) are the two
    // open-state flags; observe both to mirror them onto the trigger's
    // `aria-expanded` regardless of which path opened the panel.
    return [...(super.observedAttributes ?? []), 'data-open', 'data-menu-open'];
  }

  #isSubmenu = false;
  #overlay: OverlayController | null = null;
  #mql: MediaQueryList | null = null;

  /** Open via either path — inline (`data-open`) or overlay (`data-menu-open`). */
  get #anyOpen(): boolean {
    return this.hasAttribute('data-open') || this.hasAttribute('data-menu-open');
  }

  override attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    super.attributeChangedCallback(name, oldValue, newValue);
    if (name === 'data-open' || name === 'data-menu-open') {
      this.renderRoot
        ?.querySelector('.dropdown-toggle')
        ?.setAttribute('aria-expanded', String(this.#anyOpen));
    }
  }

  /** min-width px per Bootstrap breakpoint — mirrors mp-navbar's map. */
  static readonly #BREAKPOINT_PX: Record<string, number> = {
    xs: 0, sm: 576, md: 768, lg: 992, xl: 1200, xxl: 1400,
  };

  /** Wide mode = at/above the navbar breakpoint (matchMedia). Small/no-JS = false. */
  get #isWide(): boolean {
    return this.#mql?.matches ?? false;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    // Mark JS as present so the no-JS `:focus-within` reveal disengages.
    this.setAttribute('data-js', '');
    // A dropdown nested inside a menu is a submenu (overlay/inline behaviour).
    this.#isSubmenu = !!this.closest('mp-dropdown-menu');

    // Resolve the navbar breakpoint and publish it as `data-expand` (drives the
    // CSS inline↔float switch via media-breakpoint-up) + a matchMedia (gates the
    // JS OverlayController so it engages ONLY in wide mode; small mode stays
    // inline). Read the navbar's authored `breakpoint` attribute (present from
    // markup regardless of upgrade order).
    const bpName = this.closest('mp-navbar')?.getAttribute('breakpoint') ?? 'md';
    this.setAttribute('data-expand', bpName);
    if (typeof window !== 'undefined' && window.matchMedia) {
      const bpPx = MpNavbarDropdown.#BREAKPOINT_PX[bpName] ?? 768;
      this.#mql = window.matchMedia(`(min-width: ${bpPx}px)`);
      this.#mql.addEventListener('change', this.#onModeChange);
    }

    // Host-level Escape: catches the composed keydown whether focus is on the
    // shadow trigger OR inside the slotted (light-DOM) menu — closes the
    // innermost open dropdown and returns focus to its trigger.
    this.addEventListener('keydown', this.#onHostKeydown);

    if (this.#isSubmenu) {
      this.setAttribute('data-submenu', '');
      this.#overlay = new OverlayController(this, {
        anchor: () => this.renderRoot?.querySelector<HTMLElement>('.dropdown-toggle') ?? null,
        trigger: () => this.renderRoot?.querySelector<HTMLElement>('.dropdown-toggle') ?? null,
        // The default-slotted panel: `<mp-dropdown-menu>` directly (React/Vue), or a
        // framework wrapper host that contains it (Angular's `<bs-dropdown-menu>`).
        // Match the direct child that isn't the trigger label so the element the
        // CSS positions (`::slotted(:not([slot="label"]))`) is the same one the
        // controller moves.
        panel: () => this.querySelector<HTMLElement>(':scope > :not([slot="label"])'),
        // Open to the right of the trigger; flip to the left if it won't fit.
        positions: [
          { originX: 'end', originY: 'top', overlayX: 'start', overlayY: 'top' },
          { originX: 'start', originY: 'top', overlayX: 'end', overlayY: 'top' },
        ],
      });
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('keydown', this.#onHostKeydown);
    document.removeEventListener('mousedown', this.#onDocMouseDown, true);
    this.#mql?.removeEventListener('change', this.#onModeChange);
  }

  // Resize crossed the breakpoint: close any open panel so state doesn't leak
  // across the inline↔overlay switch (the CSS + #toggle re-resolve on next open).
  #onModeChange = (): void => {
    this.#overlay?.close();
    this.#setOpen(false);
  };

  get #open(): boolean {
    return this.hasAttribute('data-open');
  }

  #setOpen(open: boolean): void {
    if (open === this.#open) return;
    this.toggleAttribute('data-open', open);
    if (open) document.addEventListener('mousedown', this.#onDocMouseDown, true);
    else document.removeEventListener('mousedown', this.#onDocMouseDown, true);
  }

  #onDocMouseDown = (event: MouseEvent): void => {
    if (!event.composedPath().includes(this)) this.#setOpen(false);
  };

  #toggle(): void {
    // WIDE submenu → OverlayController (fixed overlay + outside-click/Esc/scroll).
    // Everything else — first-level at any width, and submenus in SMALL mode —
    // opens inline via the CSS-positioned panel + a lightweight outside-click close.
    if (this.#isSubmenu && this.#isWide && this.#overlay) this.#overlay.toggle();
    else this.#setOpen(!this.#open);
  }

  /** Close the dropdown (both the overlay and the inline paths). Public so the
   *  parent `mp-navbar` can dismiss every dropdown when a nav link is clicked. */
  close(): void {
    this.#overlay?.close();
    this.#setOpen(false);
  }

  /**
   * Toggle on MOUSEDOWN, not click — the whole gesture must resolve at press
   * time. Dismissal of a sibling's open dropdown also happens on mousedown
   * (its document capture listener, which runs before this target handler), so
   * open+close ride the SAME event, in a guaranteed order. With a click-based
   * open, a real pointer that drifts a few px between press and release makes
   * the browser retarget `click` to the common ancestor (mousedown/mouseup
   * targets differ once the sibling's panel — which bleeds under this trigger —
   * is yanked out mid-gesture), and the dropdown silently fails to open.
   * No preventDefault: it would suppress focus moving to the trigger.
   */
  #onTriggerPress = (): void => {
    this.#toggle();
  };

  #onKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault();
      this.#toggle();
    } else if (event.key === 'ArrowDown') {
      // Disclosure-nav pattern: ArrowDown opens (if needed) and moves focus
      // into the menu; the menu's roving tabindex takes over from there.
      event.preventDefault();
      if (!this.#anyOpen) this.#toggle();
      this.#focusFirstItem();
    }
    // Escape is handled at the host level (#onHostKeydown) so it also works
    // with focus inside the slotted menu, and returns focus to the trigger.
  };

  /** Escape closes the INNERMOST open dropdown and returns focus to its
   *  trigger — fires for the shadow trigger and slotted menu content alike
   *  (keydown is composed). Closed hosts let the event bubble to an open
   *  ancestor, so nested submenus unwind one level per press. */
  #onHostKeydown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape' || !this.#anyOpen) return;
    event.stopPropagation();
    this.close();
    this.renderRoot?.querySelector<HTMLElement>('.dropdown-toggle')?.focus();
  };

  /** Move focus to the first item control of the slotted menu (this menu's own
   *  items only — nested submenus keep theirs). */
  #focusFirstItem(): void {
    const panel = this.querySelector(':scope > :not([slot="label"])');
    const menu = panel?.matches('mp-dropdown-menu') ? panel : panel?.querySelector('mp-dropdown-menu');
    if (!menu) return;
    const item = [...menu.querySelectorAll('.dropdown-item')].find((i) => i.closest('mp-dropdown-menu') === menu);
    const control = item?.querySelector<HTMLElement>('a, button') ?? (item as HTMLElement | undefined);
    control?.focus();
  }

  override render() {
    return html`
      <a
        class="nav-link dropdown-toggle"
        part="toggle"
        role="button"
        tabindex="0"
        aria-haspopup="menu"
        aria-expanded="false"
        @mousedown=${this.#onTriggerPress}
        @keydown=${this.#onKeydown}
      ><slot name="label"></slot></a>
      <slot></slot>
    `;
  }
}

if (!customElements.get('mp-navbar-dropdown')) {
  customElements.define('mp-navbar-dropdown', MpNavbarDropdown);
}
