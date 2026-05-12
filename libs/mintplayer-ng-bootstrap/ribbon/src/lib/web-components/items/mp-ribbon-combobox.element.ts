import { html, type TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { MpRibbonItemBase } from './mp-ribbon-item-base';

/**
 * mp-ribbon-combobox — Dropdown selection box
 */
export class MpRibbonComboBox extends MpRibbonItemBase {
  static override styles = [];

  @property({ type: String })
  value: string = '';

  @property({ type: Array })
  options: Array<{ label: string; value: string }> = [];

  override render(): TemplateResult {
    return html`
      <div class="ribbon-combobox ${this.getSizeClass()}">
        <label class="ribbon-combobox-label">${this.label}</label>
        <select
          class="ribbon-combobox-select"
          ?disabled="${this.disabled}"
          .value="${this.value}"
          @change="${this.onComboChange}"
        >
          ${this.options.map(
            (opt) => html`<option value="${opt.value}">${opt.label}</option>`
          )}
        </select>
      </div>
    `;
  }

  private onComboChange(event: Event): void {
    if (this.disabled) return;
    const target = event.target as HTMLSelectElement;
    this.value = target.value;
    this.dispatchEvent(
      new CustomEvent('change', {
        detail: { itemId: this.itemId, value: this.value },
        bubbles: true,
        composed: true,
      })
    );
  }
}

customElements.define('mp-ribbon-combobox', MpRibbonComboBox);
