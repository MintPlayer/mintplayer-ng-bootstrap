import { ReactiveElement } from 'lit';
import { cardColorClasses } from '@mintplayer/ui-core/card';

/**
 * `<mp-card>`, the Lit front of the card (PRD #437 §8, wave A). The card has
 * no core: the element IS the Bootstrap `.card`, rendered in the light DOM
 * with no template of its own, so its children (`.card-header`, `.card-body`,
 * …) are ordinary children and the page baseline styles them. Nothing is
 * moved and nothing re-renders, so consumer nodes keep their identity.
 *
 * No-JS: visible and complete without JS once the consumer writes the
 * classes by hand (`<mp-card class="card text-bg-primary">`); the element only
 * adds them.
 *
 * Attributes:
 *  - `color`   a card colour name (`primary` … `dark`, `body`, `white`, `transparent`).
 *  - `outline` boolean; colour the border only.
 */
export class MpCardElement extends ReactiveElement {
  static override get properties() {
    return {
      color: { type: String, reflect: true },
      outline: { type: Boolean, reflect: true },
    };
  }

  color: string | null = null;
  outline = false;

  #applied: readonly string[] = [];

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  protected override updated(): void {
    const next = ['card', ...cardColorClasses(this.color, this.outline)];
    this.classList.remove(...this.#applied.filter((name) => !next.includes(name)));
    this.classList.add(...next);
    this.#applied = next;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('mp-card')) {
  customElements.define('mp-card', MpCardElement);
}

declare global {
  interface HTMLElementTagNameMap {
    'mp-card': MpCardElement;
  }
}
