import { styles } from './mp-card.element.template';
import { clearPrefixedClasses, isCardColorName } from './card-classes';

/**
 * Root of the Bootstrap card family.
 *
 * Light-DOM rendering: this element does NOT use shadow DOM. Bootstrap's
 * `_card.scss` relies on parent-child selectors (`.card > .card-header`,
 * `.card > .list-group + .card-footer`) which cannot pierce shadow roots, so
 * the entire `mp-card*` family stays in light DOM. The compiled card slice
 * is injected into `document.head` exactly once on the first connection of
 * any `<mp-card>` instance.
 *
 * Attributes:
 *  - `color`  — one of the Bootstrap colour names; maps to `text-bg-<name>`.
 *  - `outline` — boolean (presence = true); flips to `border border-<name>`
 *    plus a transparent background, instead of the filled variant.
 */
export class MpCardElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['color', 'outline'];
  }

  connectedCallback(): void {
    ensureCardStylesInjected();
    this.classList.add('card');
    this.applyColor();
  }

  attributeChangedCallback(name: string, _old: string | null, _next: string | null): void {
    if (name === 'color' || name === 'outline') this.applyColor();
  }

  private applyColor(): void {
    clearPrefixedClasses(this, 'text-bg-');
    clearPrefixedClasses(this, 'border-');
    this.classList.remove('border', 'bg-transparent');

    const color = this.getAttribute('color');
    if (!isCardColorName(color)) return;

    const isOutline = this.hasAttribute('outline') && this.getAttribute('outline') !== 'false';
    if (isOutline) {
      this.classList.add('border', `border-${color}`, 'bg-transparent');
    } else {
      this.classList.add(`text-bg-${color}`);
    }
  }
}

let cardStylesInjected = false;
function ensureCardStylesInjected(): void {
  if (cardStylesInjected) return;
  if (typeof document === 'undefined') return;
  cardStylesInjected = true;
  const style = document.createElement('style');
  style.setAttribute('data-mp-card', '');
  style.textContent = String(styles);
  document.head.appendChild(style);
}

if (typeof customElements !== 'undefined' && !customElements.get('mp-card')) {
  customElements.define('mp-card', MpCardElement);
}

declare global {
  interface HTMLElementTagNameMap {
    'mp-card': MpCardElement;
  }
}
