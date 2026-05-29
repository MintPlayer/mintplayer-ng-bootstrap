import { LitElement, html, type TemplateResult } from 'lit';
import { styles } from './mp-card.element.template';
import { cardGlobalStyles } from './card-global.styles';

/**
 * `<mp-card>` — the single web component of the card family.
 *
 * Renders a shadow DOM with one default `<slot>`; the card "chrome" (border,
 * radius, background, colour contract) lives on `:host`, so it renders
 * correctly wherever the element is placed — including deeply slotted inside
 * another web component (e.g. `<mp-timeline>`), where Bootstrap's inherited
 * `--bs-*` custom properties don't reach light-DOM content (the bug the old
 * light-DOM card hit). This deliberately revisits the issue_308 light-DOM
 * decision: shadow + `<slot>` does NOT clobber slotted children the way a
 * light-DOM `render()` did, so it avoids both that pitfall and the inheritance
 * gap.
 *
 * Card sub-parts (header / body / footer / title / text / img / …) are plain
 * class-carrying elements projected into the slot (by consumers or the
 * framework `BsCard*` wrappers). `mp-card`'s shadow styles the direct regions
 * via `::slotted(.card-header/.card-body/…)`; deeper typography (`.card-title`
 * inside a body, which `::slotted` can't reach) comes from a small global
 * sheet injected once via `ensureCardStylesInjected()`.
 *
 * Attributes:
 *  - `color`   — a Bootstrap colour name; selects the filled `:host([color])`.
 *  - `outline` — boolean (presence = true); border-only variant.
 */
export class MpCardElement extends LitElement {
  static override styles = [styles];

  static override get properties() {
    return {
      color: { type: String, reflect: true },
      outline: { type: Boolean, reflect: true },
      isServerSide: { type: Boolean, attribute: 'is-server-side' },
    };
  }

  color: string | null = null;
  outline = false;
  isServerSide = false;

  override connectedCallback(): void {
    super.connectedCallback();
    ensureCardStylesInjected();
  }

  override render(): TemplateResult {
    return html`<slot></slot>`;
  }
}

let cardStylesInjected = false;
/**
 * Inject the global card typography sheet (`.card-title`, `.card-text`,
 * `.card-link`, the `text-bg-*` utilities, …) into `document.head` exactly
 * once. These rules target content nested inside a card-body, which
 * `mp-card`'s shadow `::slotted()` rules cannot reach. Exported for the
 * framework wrappers, which render the same class-carrying elements.
 */
export function ensureCardStylesInjected(): void {
  if (cardStylesInjected) return;
  if (typeof document === 'undefined') return;
  cardStylesInjected = true;
  const style = document.createElement('style');
  style.setAttribute('data-mp-card', '');
  style.textContent = String(cardGlobalStyles);
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
