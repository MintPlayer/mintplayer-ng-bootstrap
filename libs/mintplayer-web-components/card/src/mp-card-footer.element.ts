import { applyTextBgClass } from './card-classes';
/**
 * Card footer. Mirrors `mp-card-header`'s colour handling; no nav-style
 * variant exists at this position upstream in Bootstrap.
 */
export class MpCardFooterElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['color'];
  }

  connectedCallback(): void {
    this.classList.add('card-footer');
    applyTextBgClass(this, this.getAttribute('color'));
  }

  attributeChangedCallback(name: string, _old: string | null, _next: string | null): void {
    if (name === 'color') applyTextBgClass(this, this.getAttribute('color'));
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('mp-card-footer')) {
  customElements.define('mp-card-footer', MpCardFooterElement);
}

declare global {
  interface HTMLElementTagNameMap {
    'mp-card-footer': MpCardFooterElement;
  }
}
