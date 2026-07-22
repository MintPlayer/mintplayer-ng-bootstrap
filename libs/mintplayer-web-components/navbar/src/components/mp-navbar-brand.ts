import { html } from 'lit';
import { MpNavbarElement } from './mp-navbar-element';
import { navbarBrandStyles } from '../styles';

/**
 * `<mp-navbar-brand>` — the navbar brand/logo. Place it in the navbar's
 * `slot="brand"`, and slot a link (`<a href>`) or text as its content; it is
 * styled as a Bootstrap `.navbar-brand` via `::slotted`. Light-DOM anchor →
 * works no-JS.
 *
 *     <mp-navbar-brand slot="brand"><a href="/">MyApp</a></mp-navbar-brand>
 */
export class MpNavbarBrand extends MpNavbarElement {
  static override styles = [navbarBrandStyles];

  override render() {
    return html`<slot></slot>`;
  }
}

if (!customElements.get('mp-navbar-brand')) {
  customElements.define('mp-navbar-brand', MpNavbarBrand);
}
