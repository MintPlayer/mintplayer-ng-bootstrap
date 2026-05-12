import { html, type TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { MpRibbonItemBase } from './mp-ribbon-item-base';

/**
 * mp-ribbon-group-button — Toggle strip (multiple buttons, one selected at a time)
 */
export class MpRibbonGroupButton extends MpRibbonItemBase {
  static override styles = [];

  @property({ type: String })
  selectedValue: string = '';

  @property({ type: Array })
  buttons: Array<{ label: string; value: string; icon?: string }> = [];

  override render(): TemplateResult {
    return html`
      <div class="ribbon-group-button ${this.getSizeClass()}" role="group" aria-label="${this.label}">
        ${this.buttons.map(
          (btn) => html`
            <button
              class="ribbon-group-button-item ${this.selectedValue === btn.value ? 'selected' : ''}"
              ?disabled="${this.disabled}"
              data-value="${btn.value}"
              @click="${this.onButtonSelect}"
              aria-pressed="${this.selectedValue === btn.value}"
            >
              ${btn.icon ? html`<span class="ribbon-button-icon">${btn.icon}</span>` : ''}
              ${btn.label}
            </button>
          `
        )}
      </div>
    `;
  }

  private onButtonSelect(event: Event): void {
    if (this.disabled) return;
    const btn = event.target as HTMLElement;
    const value = btn.getAttribute('data-value');
    if (value) {
      this.selectedValue = value;
      this.dispatchEvent(
        new CustomEvent('change', {
          detail: { itemId: this.itemId, value: this.selectedValue },
          bubbles: true,
          composed: true,
        })
      );
    }
  }
}

customElements.define('mp-ribbon-group-button', MpRibbonGroupButton);
