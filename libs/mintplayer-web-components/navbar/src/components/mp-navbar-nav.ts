import { ReactiveElement } from 'lit';
import { applyHostProps, EMPTY_HOST_PROPS } from '@mintplayer/web-components/machine';
import { connectNavbarNav } from '@mintplayer/ui-core/navbar';

/**
 * `<mp-navbar-nav>` — a `.navbar-nav` group of `<mp-navbar-item>`s and
 * `<mp-navbar-dropdown>`s (#437). The element itself is the group (the
 * compiled template's root is its host), so its children stay where they are.
 *
 * Attributes: `align` (`start`, default, or `end`, which pushes the group to
 * the far edge when the bar is wide).
 */
export class MpNavbarNav extends ReactiveElement {
  static override properties = { align: { type: String, reflect: true } };

  declare align: 'start' | 'end';
  #host = EMPTY_HOST_PROPS;

  constructor() {
    super();
    this.align = 'start';
  }

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  protected override update(changed: Map<string, unknown>): void {
    super.update(changed);
    this.#host = applyHostProps(this, this.#host, connectNavbarNav(this.align === 'end' ? 'end' : 'start'));
  }
}

if (!customElements.get('mp-navbar-nav')) {
  customElements.define('mp-navbar-nav', MpNavbarNav);
}

declare global {
  interface HTMLElementTagNameMap {
    'mp-navbar-nav': MpNavbarNav;
  }
}
