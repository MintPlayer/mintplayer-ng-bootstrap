/**
 * Card body. Pure structural wrapper — adds `card-body` to itself so
 * Bootstrap's body padding / flex layout apply.
 */
export class MpCardBodyElement extends HTMLElement {
  connectedCallback(): void {
    this.classList.add('card-body');
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('mp-card-body')) {
  customElements.define('mp-card-body', MpCardBodyElement);
}

declare global {
  interface HTMLElementTagNameMap {
    'mp-card-body': MpCardBodyElement;
  }
}
