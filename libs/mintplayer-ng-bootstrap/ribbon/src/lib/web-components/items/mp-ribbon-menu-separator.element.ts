import { css, html, LitElement, type TemplateResult } from 'lit';

export class MpRibbonMenuSeparator extends LitElement {
  static override styles = css`
    :host { display: block; }
    .separator {
      height: 1px;
      background: var(--bs-ribbon-group-separator, rgba(0, 0, 0, 0.12));
      margin: 4px 0;
    }
  `;

  override connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'separator');
  }

  override render(): TemplateResult {
    return html`<div class="separator"></div>`;
  }
}

customElements.define('mp-ribbon-menu-separator', MpRibbonMenuSeparator);
