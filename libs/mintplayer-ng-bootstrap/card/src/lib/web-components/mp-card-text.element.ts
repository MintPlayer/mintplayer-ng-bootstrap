/** Card text — adds `card-text` for Bootstrap's last-child margin reset. */
export class MpCardTextElement extends HTMLElement {
  connectedCallback(): void {
    this.classList.add('card-text');
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('mp-card-text')) {
  customElements.define('mp-card-text', MpCardTextElement);
}

declare global {
  interface HTMLElementTagNameMap {
    'mp-card-text': MpCardTextElement;
  }
}
