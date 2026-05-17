import { clearPrefixedClasses, isCardColorName } from './card-classes';

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
    this.applyColor();
  }

  attributeChangedCallback(name: string, _old: string | null, _next: string | null): void {
    if (name === 'color') this.applyColor();
  }

  private applyColor(): void {
    clearPrefixedClasses(this, 'text-bg-');
    const color = this.getAttribute('color');
    if (isCardColorName(color)) {
      this.classList.add(`text-bg-${color}`);
    }
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
