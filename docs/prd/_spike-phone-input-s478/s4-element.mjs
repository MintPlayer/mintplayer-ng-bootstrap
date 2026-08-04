// S4.3 — a minimal stand-in for `mp-phone-input`'s country list: a Lit element
// that renders localized region names from `Intl.DisplayNames`, i.e. values the
// server and the client each compute independently. Server-rendered to
// Declarative Shadow DOM by `s4-ssr-render.mjs`, hydrated on the client.
import { LitElement, html, css } from 'lit';

// A small, high-signal subset: codes whose names are stable, plus the awkward
// ones, plus the ones the ICU-skew report flags.
export const SAMPLE = ['be', 'nl', 'fr', 'de', 'gb', 'us', 'xk', 'ac', 'bq', 'sx', 'eh', 'io', 'cz', 'sz', 'mk', 'tr'];

export class S4CountryList extends LitElement {
  static properties = {
    locale: { type: String },
  };

  static styles = css`
    :host { display: block; font: 14px system-ui; }
    ol { margin: 0; padding-left: 2em; }
    li { white-space: pre; }
  `;

  constructor() {
    super();
    this.locale = undefined;
  }

  render() {
    const dn = new Intl.DisplayNames(this.locale || undefined, { type: 'region' });
    return html`
      <p id="resolved">resolved: ${dn.resolvedOptions().locale}</p>
      <ol>
        ${SAMPLE.map((c) => html`<li data-code=${c}>${dn.of(c.toUpperCase())}</li>`)}
      </ol>
    `;
  }
}

customElements.define('s4-country-list', S4CountryList);
