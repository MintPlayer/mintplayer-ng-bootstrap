import { css, html, type TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { MpRibbonItemBase } from './mp-ribbon-item-base';
export interface RibbonGroupButtonOption {
  label: string;
  value: string;
  icon?: string;
}

/**
 * mp-ribbon-group-button — Radio-strip of buttons; one selected at a time.
 * Each inner button is `role="radio"` inside a `role="radiogroup"`.
 */
export class MpRibbonGroupButton extends MpRibbonItemBase {
  static override styles = css`
    :host { display: inline-flex; }
    .ribbon-group-button {
      display: inline-flex;
      align-items: stretch;
      border-radius: var(--bs-ribbon-item-radius, 3px);
    }
    .ribbon-group-button-item {
      background: transparent;
      border: 1px solid transparent;
      cursor: pointer;
      color: inherit;
      font-size: 12px;
      font-family: inherit;
      padding: 4px 8px;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .ribbon-group-button-item:hover:not(:disabled):not(.selected) {
      background: var(--bs-ribbon-item-hover-bg, #e9ecef);
      border-color: var(--bs-ribbon-item-hover-border, #ced4da);
    }
    .ribbon-group-button-item.selected {
      background: var(--bs-ribbon-item-pressed-bg, #dee2e6);
      border-color: var(--bs-ribbon-item-hover-border, #ced4da);
    }
    .ribbon-group-button-item:focus-visible {
      outline: 2px solid var(--bs-ribbon-app-accent, #0d6efd);
      outline-offset: -2px;
    }
    .ribbon-group-button-item:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .ribbon-group-button-icon { line-height: 1; }
    .ribbon-group-button-label { white-space: nowrap; }
  `;

  @property({ type: String, attribute: 'selected-value', reflect: true })
  selectedValue: string = '';

  @property({ type: Array })
  buttons: Array<RibbonGroupButtonOption> = [];

  override render(): TemplateResult {
    return html`
      <div
        class="ribbon-group-button"
        role="radiogroup"
        aria-label="${this.label}"
      >
        ${this.buttons.map(
          (btn) => html`
            <button
              class="ribbon-group-button-item ${this.selectedValue === btn.value ? 'selected' : ''}"
              ?disabled="${this.disabled}"
              role="radio"
              aria-checked="${this.selectedValue === btn.value}"
              title="${btn.label}"
              @click="${(e: Event) => this.onSelect(e, btn.value)}"
            >
              ${btn.icon
                ? html`<span class="ribbon-group-button-icon">${btn.icon}</span>`
                : ''}
              ${btn.label
                ? html`<span class="ribbon-group-button-label">${btn.label}</span>`
                : ''}
            </button>
          `
        )}
      </div>
    `;
  }

  private onSelect(event: Event, value: string): void {
    event.stopPropagation();
    if (this.disabled) return;
    this.selectedValue = value;
    this.dispatchEvent(
      new CustomEvent('group-select', {
        detail: { itemId: this.itemId, value: this.selectedValue },
        bubbles: true,
        composed: true,
      })
    );
  }
}

customElements.define('mp-ribbon-group-button', MpRibbonGroupButton);
