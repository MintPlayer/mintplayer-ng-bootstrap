import { css, html, LitElement, type TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
/**
 * mp-ribbon-contextual-tab-set — Wraps one or more `<mp-ribbon-tab>` children
 * with a shared header label + accent colour. Toggling the `hidden` attribute
 * shows / hides the entire group; the parent `<mp-ribbon>` listens for
 * `contextual-visibility-change` to re-process its tab strip.
 *
 * Uses `:host { display: contents; }` so the set is transparent in the layout
 * tree — only its slotted tabs participate visually.
 */
export class MpRibbonContextualTabSet extends LitElement {
  static override styles = css`
    :host { display: contents; }
  `;

  @property({ type: String, reflect: true })
  label: string = '';

  @property({ type: String, reflect: true })
  color: string = '#F0AF84';

  @property({ type: Boolean, reflect: true })
  override hidden: boolean = false;

  override updated(changed: Map<string, unknown>): void {
    if (changed.has('hidden') || changed.has('label') || changed.has('color')) {
      this.dispatchEvent(
        new CustomEvent('contextual-visibility-change', {
          detail: { hidden: this.hidden, label: this.label, color: this.color },
          bubbles: true,
          composed: true,
        })
      );
    }
  }

  override render(): TemplateResult {
    return html`<slot></slot>`;
  }
}

customElements.define('mp-ribbon-contextual-tab-set', MpRibbonContextualTabSet);
