import { html, type TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { MpRibbonItemBase } from './mp-ribbon-item-base';

/**
 * mp-ribbon-gallery — Grid/list of items with preview (slot-based)
 */
export class MpRibbonGallery extends MpRibbonItemBase {
  static override styles = [];

  @property({ type: Number })
  columns: number = 4;

  override render(): TemplateResult {
    return html`
      <div class="ribbon-gallery ${this.getSizeClass()}" role="region" aria-label="${this.label}">
        <div class="ribbon-gallery-label">${this.label}</div>
        <div class="ribbon-gallery-items" style="grid-template-columns: repeat(${this.columns}, 1fr);">
          <slot></slot>
        </div>
      </div>
    `;
  }
}

customElements.define('mp-ribbon-gallery', MpRibbonGallery);
