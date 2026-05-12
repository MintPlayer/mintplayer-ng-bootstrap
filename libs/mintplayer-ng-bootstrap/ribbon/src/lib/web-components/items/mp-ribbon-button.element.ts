import { html, type TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { MpRibbonItemBase } from './mp-ribbon-item-base';

/**
 * mp-ribbon-button — Simple button item.
 * Renders a button with label and optional icon.
 */
export class MpRibbonButton extends MpRibbonItemBase {
  static override styles = [];

  override render(): TemplateResult {
    return html`
      <button
        class="ribbon-button ${this.getSizeClass()}"
        ?disabled="${this.disabled}"
        title="${this.tooltip || this.label}"
      >
        ${this.icon ? html`<span class="ribbon-button-icon">${this.icon}</span>` : ''}
        ${this.label ? html`<span class="ribbon-button-label">${this.label}</span>` : ''}
      </button>
    `;
  }
}

customElements.define('mp-ribbon-button', MpRibbonButton);
