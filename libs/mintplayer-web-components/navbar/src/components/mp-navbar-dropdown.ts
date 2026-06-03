import { html } from 'lit';
import { MpNavbarElement } from './mp-navbar-element';
import { navbarDropdownStyles } from '../styles';

/**
 * `<mp-navbar-dropdown>` — a navbar nav entry that opens a dropdown. Slot the
 * trigger label into `slot="label"` and an `<mp-dropdown-menu>` as the default
 * content (the panel).
 *
 *     <mp-navbar-dropdown>
 *       <span slot="label">Products</span>
 *       <mp-dropdown-menu>
 *         <mp-dropdown-item><a href="/p1">Product 1</a></mp-dropdown-item>
 *       </mp-dropdown-menu>
 *     </mp-navbar-dropdown>
 *
 * No-JS: the panel reveals on `:focus-within` (the trigger is focusable). With
 * JS, a click toggles it (reflected as `data-open`) and an outside click / Esc
 * closes it. First-level panel is positioned + height-capped purely in CSS (see
 * navbar-dropdown.styles.scss). Sub-dropdowns (an mp-navbar-dropdown nested in a
 * dropdown item) are handled separately.
 */
export class MpNavbarDropdown extends MpNavbarElement {
  static override styles = [navbarDropdownStyles];

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener('mousedown', this.#onDocMouseDown, true);
  }

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

  #onToggle = (event: Event): void => {
    event.preventDefault();
    this.#setOpen(!this.#open);
  };

  #onKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault();
      this.#setOpen(!this.#open);
    } else if (event.key === 'Escape' && this.#open) {
      this.#setOpen(false);
    }
  };

  override render() {
    return html`
      <a
        class="nav-link dropdown-toggle"
        part="toggle"
        role="button"
        tabindex="0"
        aria-haspopup="menu"
        @click=${this.#onToggle}
        @keydown=${this.#onKeydown}
      ><slot name="label"></slot></a>
      <slot></slot>
    `;
  }
}

if (!customElements.get('mp-navbar-dropdown')) {
  customElements.define('mp-navbar-dropdown', MpNavbarDropdown);
}
