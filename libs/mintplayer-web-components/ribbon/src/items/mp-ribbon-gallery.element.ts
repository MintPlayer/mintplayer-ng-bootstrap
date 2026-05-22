import { css, html, type TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { MpRibbonItemBase } from './mp-ribbon-item-base';

/**
 * mp-ribbon-gallery — grid container for `mp-ribbon-gallery-item` children.
 * `[columns]` controls the grid track count.
 */
export class MpRibbonGallery extends MpRibbonItemBase {
  static override styles = css`
    :host { display: inline-flex; }
    .ribbon-gallery {
      display: grid;
      gap: 2px;
      padding: 2px;
      border: 1px solid var(--bs-ribbon-item-hover-border, #ced4da);
      border-radius: var(--bs-ribbon-item-radius, 3px);
      background: var(--bs-ribbon-tabpanel-bg, #fff);
    }
  `;

  @property({ type: Number })
  columns: number = 4;

  override render(): TemplateResult {
    return html`
      <div
        class="ribbon-gallery"
        role="listbox"
        aria-label="${this.label}"
        style="grid-template-columns: repeat(${this.columns}, 1fr);"
      >
        <slot></slot>
      </div>
    `;
  }
}

customElements.define('mp-ribbon-gallery', MpRibbonGallery);
