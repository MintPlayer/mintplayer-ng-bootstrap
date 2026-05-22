import { styles } from './mp-card.element.template';
import { applyCardColorClasses } from './card-classes';

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
    const color = this.getAttribute('color');
    const isOutline = this.hasAttribute('outline') && this.getAttribute('outline') !== 'false';
    applyCardColorClasses(this, color, isOutline);
  }
}

let cardStylesInjected = false;
/**
 * Inject the compiled Bootstrap-card SCSS into `document.head` exactly once
 * per page. Called from `MpCardElement.connectedCallback()` and also exported
 * for the Angular wrapper (`BsCardComponent`) which doesn't instantiate
 * `<mp-card>` itself but needs the same global cascade.
 */
export function ensureCardStylesInjected(): void {
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
