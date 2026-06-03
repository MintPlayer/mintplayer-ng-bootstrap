import { html } from 'lit';
import { MpDropdownElement } from './mp-dropdown-element';
import { dropdownDividerStyles } from '../styles';

/**
 * `<mp-dropdown-divider>` — a Bootstrap `.dropdown-divider` separator for use
 * inside `<mp-dropdown-menu>`. Non-interactive; the menu skips it in roving
 * keyboard navigation.
 */
export class MpDropdownDivider extends MpDropdownElement {
  static override styles = [dropdownDividerStyles];

  override connectedCallback(): void {
    super.connectedCallback();
    if (!this.hasAttribute('role')) this.setAttribute('role', 'separator');
  }

  override render() {
    return html`<hr class="dropdown-divider" part="divider" />`;
  }
}

if (!customElements.get('mp-dropdown-divider')) {
  customElements.define('mp-dropdown-divider', MpDropdownDivider);
}
