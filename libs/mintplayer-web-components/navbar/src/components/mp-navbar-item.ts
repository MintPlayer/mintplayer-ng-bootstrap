import { ReactiveElement } from 'lit';
import { applyHostProps, EMPTY_HOST_PROPS } from '@mintplayer/web-components/machine';
import { connectNavbarItem } from '@mintplayer/ui-core/navbar';

/**
 * `<mp-navbar-item>` — one navbar entry around a consumer link (#437): a
 * `.nav-item` in a `<mp-navbar-nav>`, a `.dropdown-item` inside a
 * `<mp-navbar-dropdown>`. The element itself is the entry, so the link stays
 * where it was authored and navigates with no JavaScript.
 *
 *     <mp-navbar-item active><a href="/home">Home</a></mp-navbar-item>
 *
 * Attributes: `active` (the current page, `aria-current`), `disabled`.
 */
export class MpNavbarItem extends ReactiveElement {
  static override properties = {
    active: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
  };

  declare active: boolean;
  declare disabled: boolean;
  #host = EMPTY_HOST_PROPS;

  constructor() {
    super();
    this.active = false;
    this.disabled = false;
  }

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  protected override update(changed: Map<string, unknown>): void {
    super.update(changed);
    const inMenu = !!this.parentElement?.closest('mp-navbar-dropdown');
    this.#host = applyHostProps(this, this.#host, connectNavbarItem({ inMenu, active: this.active, disabled: this.disabled }));
  }
}

if (!customElements.get('mp-navbar-item')) {
  customElements.define('mp-navbar-item', MpNavbarItem);
}

declare global {
  interface HTMLElementTagNameMap {
    'mp-navbar-item': MpNavbarItem;
  }
}
