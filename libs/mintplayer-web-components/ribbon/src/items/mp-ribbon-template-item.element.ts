import { css, html, LitElement, type TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
/**
 * mp-ribbon-template-item — Transparent slot wrapper so consumers can drop
 * arbitrary content into a ribbon group while still participating in the
 * group's size-based grid layout. Reflects `size` so the group's grid
 * placement (`::slotted([size="..."])`) targets it correctly.
 */
export class MpRibbonTemplateItem extends LitElement {
  static override styles = css`
    :host { display: inline-flex; }
    :host([size="small"]) { display: flex; width: 100%; }
  `;

  @property({ type: String, reflect: true })
  size: 'large' | 'medium' | 'small' = 'medium';

  override render(): TemplateResult {
    return html`<slot></slot>`;
  }
}

customElements.define('mp-ribbon-template-item', MpRibbonTemplateItem);
