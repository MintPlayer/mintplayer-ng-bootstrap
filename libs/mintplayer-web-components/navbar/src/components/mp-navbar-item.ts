import { html } from 'lit';
import { MpNavbarElement } from './mp-navbar-element';
import { navbarItemStyles } from '../styles';

/**
 * `<mp-navbar-item>` — a navbar nav entry. Slot a real link (`<a href>`) as the
 * default content: it stays light DOM so it navigates with no JavaScript, and is
 * styled as a Bootstrap `.nav-link` via `::slotted` (see navbar-item.styles.scss).
 * Routing (e.g. Angular `routerLink`) is added by the framework wrapper on the
 * slotted anchor.
 *
 * Attributes (reflected; drive `::slotted` styling, so the DSD chrome stays static):
 *  - `active` — current page (`.active` appearance).
 *  - `disabled` — non-interactive.
 */
export class MpNavbarItem extends MpNavbarElement {
  static override styles = [navbarItemStyles];

  // No host role. The navbar's nav groups are plain divs (not lists):
  // arbitrary slotted content — dropdowns, forms, buttons — can never satisfy
  // a list's required-children contract, so the navbar carries no list
  // semantics and items claim no listitem (axe list/aria-required-parent).

  override render() {
    return html`<slot></slot>`;
  }
}

if (!customElements.get('mp-navbar-item')) {
  customElements.define('mp-navbar-item', MpNavbarItem);
}
