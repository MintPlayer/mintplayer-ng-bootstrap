/** Card group — Bootstrap's connected-card layout primitive. */
export class MpCardGroupElement extends HTMLElement {
  connectedCallback(): void {
    this.classList.add('card-group');
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('mp-card-group')) {
  customElements.define('mp-card-group', MpCardGroupElement);
}

declare global {
  interface HTMLElementTagNameMap {
    'mp-card-group': MpCardGroupElement;
  }
}
