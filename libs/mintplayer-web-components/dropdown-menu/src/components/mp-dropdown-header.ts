import { html } from 'lit';
import { MpDropdownElement } from './mp-dropdown-element';
import { dropdownHeaderStyles } from '../styles';

/**
 * `<mp-dropdown-header>` — a Bootstrap `.dropdown-header` group label for use
 * inside `<mp-dropdown-menu>`. Non-interactive; skipped in roving keyboard nav.
 * Slot the label text as the default content.
 */
export class MpDropdownHeader extends MpDropdownElement {
  static override styles = [dropdownHeaderStyles];

  override connectedCallback(): void {
    super.connectedCallback();
    if (!this.hasAttribute('role')) this.setAttribute('role', 'presentation');
  }

  override render() {
    return html`<h6 class="dropdown-header" part="header"><slot></slot></h6>`;
  }
}

if (!customElements.get('mp-dropdown-header')) {
  customElements.define('mp-dropdown-header', MpDropdownHeader);
}
