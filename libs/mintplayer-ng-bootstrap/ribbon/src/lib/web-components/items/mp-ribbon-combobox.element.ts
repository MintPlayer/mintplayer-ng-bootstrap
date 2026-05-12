import { css, html, type TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { MpRibbonItemBase } from './mp-ribbon-item-base';

export interface RibbonComboBoxOption {
  label: string;
  value: string;
}

/**
 * mp-ribbon-combobox — Native `<select>` styled to match the ribbon. Options
 * are taken as an array via the `options` property; consumers wanting a
 * declarative `<option>` projection should use `<bs-ribbon-combobox>` and
 * a `@ContentChildren`-based wrapper (deferred).
 */
export class MpRibbonComboBox extends MpRibbonItemBase {
  static override styles = css`
    :host { display: inline-flex; align-items: center; }
    .ribbon-combobox-select {
      background: var(--bs-ribbon-tabpanel-bg, #fff);
      color: inherit;
      border: 1px solid var(--bs-ribbon-item-hover-border, #ced4da);
      border-radius: var(--bs-ribbon-item-radius, 3px);
      padding: 3px 4px;
      font-size: 12px;
      font-family: inherit;
      min-width: 100px;
      max-width: 200px;
    }
    .ribbon-combobox-select:focus-visible {
      outline: 2px solid var(--bs-ribbon-app-accent, #0d6efd);
      outline-offset: -2px;
    }
    .ribbon-combobox-select:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `;

  @property({ type: String })
  value: string = '';

  @property({ type: Array })
  options: Array<RibbonComboBoxOption> = [];

  override render(): TemplateResult {
    return html`
      <select
        class="ribbon-combobox-select"
        ?disabled="${this.disabled}"
        aria-label="${this.label || ''}"
        title="${this.tooltip || this.label}"
        @change="${this.onComboChange}"
      >
        ${this.options.map(
          (opt) => html`<option
            value="${opt.value}"
            ?selected="${opt.value === this.value}"
          >${opt.label}</option>`
        )}
      </select>
    `;
  }

  private onComboChange(event: Event): void {
    if (this.disabled) return;
    const target = event.target as HTMLSelectElement;
    this.value = target.value;
    this.dispatchEvent(
      new CustomEvent('value-change', {
        detail: { itemId: this.itemId, value: this.value },
        bubbles: true,
        composed: true,
      })
    );
  }
}

customElements.define('mp-ribbon-combobox', MpRibbonComboBox);
