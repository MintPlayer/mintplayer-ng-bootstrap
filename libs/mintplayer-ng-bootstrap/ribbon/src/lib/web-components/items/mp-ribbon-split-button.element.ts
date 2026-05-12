import { html, type TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { MpRibbonItemBase } from './mp-ribbon-item-base';

/**
 * mp-ribbon-split-button — Button with an adjacent dropdown arrow.
 * Two parts: main action + dropdown menu.
 */
export class MpRibbonSplitButton extends MpRibbonItemBase {
  static override styles = [];

  @property({ type: Boolean })
  menuOpen: boolean = false;

  override render(): TemplateResult {
    return html`
      <div class="ribbon-split-button ${this.getSizeClass()}">
        <button
          class="ribbon-split-button-main"
          ?disabled="${this.disabled}"
          title="${this.tooltip || this.label}"
        >
          ${this.icon ? html`<span class="ribbon-button-icon">${this.icon}</span>` : ''}
          ${this.label ? html`<span class="ribbon-button-label">${this.label}</span>` : ''}
        </button>
        <button
          class="ribbon-split-button-dropdown"
          ?disabled="${this.disabled}"
          aria-label="Open menu"
          @click="${this.onDropdownClick}"
        >
          ▼
        </button>
      </div>
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

customElements.define('mp-ribbon-split-button', MpRibbonSplitButton);
