import { html, type TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { MpRibbonItemBase } from './mp-ribbon-item-base';

/**
 * mp-ribbon-checkbox — Checkbox item with label
 */
export class MpRibbonCheckBox extends MpRibbonItemBase {
  static override styles = [];

  @property({ type: Boolean })
  checked: boolean = false;

  override render(): TemplateResult {
    return html`
      <label class="ribbon-checkbox ${this.getSizeClass()}">
        <input
          type="checkbox"
          ?checked="${this.checked}"
          ?disabled="${this.disabled}"
          @change="${this.onCheckChange}"
        />
        <span class="ribbon-checkbox-label">${this.label}</span>
      </label>
    `;
  }

  private onCheckChange(event: Event): void {
    if (this.disabled) return;
    const target = event.target as HTMLInputElement;
    this.checked = target.checked;
    this.dispatchEvent(
      new CustomEvent('change', {
        detail: { itemId: this.itemId, checked: this.checked },
        bubbles: true,
        composed: true,
      })
    );
  }
}

customElements.define('mp-ribbon-checkbox', MpRibbonCheckBox);
