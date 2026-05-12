import { html, type TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { MpRibbonItemBase } from './mp-ribbon-item-base';

/**
 * mp-ribbon-color-picker — Color selection box
 */
export class MpRibbonColorPicker extends MpRibbonItemBase {
  static override styles = [];

  @property({ type: String })
  color: string = '#000000';

  override render(): TemplateResult {
    return html`
      <div class="ribbon-color-picker ${this.getSizeClass()}">
        <label class="ribbon-color-picker-label">${this.label}</label>
        <input
          type="color"
          class="ribbon-color-picker-input"
          .value="${this.color}"
          ?disabled="${this.disabled}"
          @change="${this.onColorChange}"
        />
      </div>
    `;
  }

  private onColorChange(event: Event): void {
    if (this.disabled) return;
    const target = event.target as HTMLInputElement;
    this.color = target.value;
    this.dispatchEvent(
      new CustomEvent('change', {
        detail: { itemId: this.itemId, color: this.color },
        bubbles: true,
        composed: true,
      })
    );
  }
}

customElements.define('mp-ribbon-color-picker', MpRibbonColorPicker);
