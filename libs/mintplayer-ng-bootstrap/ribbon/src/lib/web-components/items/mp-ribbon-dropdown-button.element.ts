import { html, type TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { MpRibbonItemBase } from './mp-ribbon-item-base';

/**
 * mp-ribbon-dropdown-button — Button that opens a dropdown menu (primary action)
 */
export class MpRibbonDropdownButton extends MpRibbonItemBase {
  static override styles = [];

  @property({ type: Boolean })
  menuOpen: boolean = false;

  override render(): TemplateResult {
    return html`
      <button
        class="ribbon-dropdown-button ${this.getSizeClass()}"
        ?disabled="${this.disabled}"
        title="${this.tooltip || this.label}"
        @click="${this.onDropdownClick}"
      >
        ${this.icon ? html`<span class="ribbon-button-icon">${this.icon}</span>` : ''}
        ${this.label ? html`<span class="ribbon-button-label">${this.label}</span>` : ''}
        <span class="ribbon-dropdown-arrow">▼</span>
      </button>
    `;
  }

  private onDropdownClick(): void {
    if (this.disabled) return;
    this.menuOpen = !this.menuOpen;
    this.dispatchEvent(
      new CustomEvent('menu-toggle', {
        detail: { itemId: this.itemId, open: this.menuOpen },
        bubbles: true,
        composed: true,
      })
    );
  }
}

customElements.define('mp-ribbon-dropdown-button', MpRibbonDropdownButton);
