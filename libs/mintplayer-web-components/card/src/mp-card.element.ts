import { LitElement, html, type TemplateResult } from 'lit';
import { installLightStyles } from '@mintplayer/web-components/light-dom';
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
 * framework `BsCard*` wrappers). The regions and the typography inside them
 * are styled by a document-level sheet installed through the shared
 * light-style registry, not by `::slotted()` — which cannot reach `.card-title`
 * inside a body, nor out-rank Bootstrap's own `.card-header`. Every rule in it is
 * anchored on `mp-card`, so it never reaches content outside a card (#432).
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

  override render(): TemplateResult {
    return html`<slot></slot>`;
  }
}

// The sheet styles regions and typography nested inside a card, which
// mp-card's shadow ::slotted() rules cannot reach (or cannot out-rank). It goes
// through the shared registry — the only document-level CSS writer — so the
// scoping conformance suite checks it and shadow hosts that adopt the registry
// mirror it. Installed before define, so importing the element is enough.
installLightStyles('card', cardGlobalStyles);

if (typeof customElements !== 'undefined' && !customElements.get('mp-card')) {
  customElements.define('mp-card', MpCardElement);
}

declare global {
  interface HTMLElementTagNameMap {
    'mp-card': MpCardElement;
  }
}
