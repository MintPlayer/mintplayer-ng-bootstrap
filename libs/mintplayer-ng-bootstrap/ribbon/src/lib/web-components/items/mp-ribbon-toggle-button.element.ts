import { html, type TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { MpRibbonItemBase } from './mp-ribbon-item-base';

/**
 * mp-ribbon-toggle-button — Button that maintains pressed/unpressed state
 */
export class MpRibbonToggleButton extends MpRibbonItemBase {
  static override styles = [];

  @property({ type: Boolean })
  pressed: boolean = false;

  override render(): TemplateResult {
    return html`
      <button
        class="ribbon-toggle-button ${this.getSizeClass()} ${this.pressed ? 'pressed' : ''}"
        ?disabled="${this.disabled}"
        aria-pressed="${this.pressed}"
        title="${this.tooltip || this.label}"
        @click="${this.onToggleClick}"
      >
        ${this.icon ? html`<span class="ribbon-button-icon">${this.icon}</span>` : ''}
        ${this.label ? html`<span class="ribbon-button-label">${this.label}</span>` : ''}
      </button>
    `;
  }

  private onToggleClick(): void {
    if (this.disabled) return;
    this.pressed = !this.pressed;
    this.dispatchEvent(
      new CustomEvent('toggle', {
        detail: { itemId: this.itemId, pressed: this.pressed },
        bubbles: true,
        composed: true,
      })
    );
  }
}

customElements.define('mp-ribbon-toggle-button', MpRibbonToggleButton);
