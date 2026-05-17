/** Card subtitle — adds `card-subtitle`. */
export class MpCardSubtitleElement extends HTMLElement {
  connectedCallback(): void {
    this.classList.add('card-subtitle');
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('mp-card-subtitle')) {
  customElements.define('mp-card-subtitle', MpCardSubtitleElement);
}

declare global {
  interface HTMLElementTagNameMap {
    'mp-card-subtitle': MpCardSubtitleElement;
  }
}
