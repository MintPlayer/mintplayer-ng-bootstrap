import { LitElement, css, html, type TemplateResult } from 'lit';

/**
 * `<mp-accordion-tab>` — inert marker child of `<mp-accordion>`.
 *
 * Holds one tab's BODY content and carries that tab's state as attributes
 * (`is-active`, `disabled`). It renders nothing of its own: the parent owns
 * the entire accordion chrome in a single shadow root (headers, inputs,
 * ARIA, animation), and slots this element into the matching collapse
 * region. The `mp-tab-page` precedent.
 *
 * A tab's HEADER cannot live inside this element — named slots only accept
 * direct children of the shadow host — so it is authored as a sibling
 * carrying the `accordion-header` attribute. The i-th header pairs with the
 * i-th tab; the framework wrappers hoist header templates automatically, so
 * only vanilla consumers see the flat shape:
 *
 *     <mp-accordion>
 *       <span accordion-header>Profile</span>
 *       <mp-accordion-tab is-active>Profile body</mp-accordion-tab>
 *     </mp-accordion>
 *
 * This element is a convenience, not a requirement: the parent recognises
 * tabs by the `accordion-tab` attribute (which this one stamps on itself),
 * so a wrapper's own host element can be the marker instead.
 */
export class MpAccordionTab extends LitElement {
  static override styles = css`
    :host {
      display: block;
    }
  `;

  override connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('accordion-tab', '');
  }

  override render(): TemplateResult {
    return html`<slot></slot>`;
  }
}

if (
  typeof customElements !== 'undefined' &&
  !customElements.get('mp-accordion-tab')
) {
  customElements.define('mp-accordion-tab', MpAccordionTab);
}
