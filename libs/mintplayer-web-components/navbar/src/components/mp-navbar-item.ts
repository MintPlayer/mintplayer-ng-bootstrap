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

  override connectedCallback(): void {
    super.connectedCallback();
    // The host sits inside the navbar's <ul>; a role-less custom element
    // leaves that list with zero owned listitems. Wrappers stamp this
    // STATICALLY (the DSD has no connectedCallback); this covers vanilla use.
    if (!this.hasAttribute('role')) this.setAttribute('role', 'listitem');
  }

  override render() {
    return html`<slot></slot>`;
  }
}

if (!customElements.get('mp-navbar-item')) {
  customElements.define('mp-navbar-item', MpNavbarItem);
}
