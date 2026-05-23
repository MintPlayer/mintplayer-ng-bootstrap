/**
 * Card title — adds `card-title` for Bootstrap's title spacing/colour vars.
 * Render as a heading in the consuming app if heading semantics matter; the
 * WC stays element-agnostic to avoid forcing an h-level.
 */
export class MpCardTitleElement extends HTMLElement {
  connectedCallback(): void {
    this.classList.add('card-title');
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('mp-card-title')) {
  customElements.define('mp-card-title', MpCardTitleElement);
}

declare global {
  interface HTMLElementTagNameMap {
    'mp-card-title': MpCardTitleElement;
  }
}
