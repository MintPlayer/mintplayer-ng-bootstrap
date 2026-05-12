import { css, html, type TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { MpRibbonItemBase } from './mp-ribbon-item-base';

/**
 * mp-ribbon-toggle-button — Button that maintains pressed/unpressed state.
 * `aria-pressed` mirrors the `pressed` property.
 */
export class MpRibbonToggleButton extends MpRibbonItemBase {
  static override styles = css`
    :host { display: inline-flex; }
    :host([size="small"]) { display: flex; width: 100%; }
    .ribbon-toggle-button {
      display: inline-flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
      background: transparent;
      border: 1px solid transparent;
      border-radius: var(--bs-ribbon-item-radius, 3px);
      cursor: pointer;
      color: inherit;
      font-size: 12px;
      font-family: inherit;
      padding: 4px 6px;
      min-width: 28px;
    }
    .ribbon-toggle-button:hover:not(:disabled):not(.pressed) {
      background: var(--bs-ribbon-item-hover-bg, #e9ecef);
      border-color: var(--bs-ribbon-item-hover-border, #ced4da);
    }
    .ribbon-toggle-button.pressed {
      background: var(--bs-ribbon-item-pressed-bg, #dee2e6);
      border-color: var(--bs-ribbon-item-hover-border, #ced4da);
    }
    .ribbon-toggle-button:focus-visible {
      outline: 2px solid var(--bs-ribbon-app-accent, #0d6efd);
      outline-offset: -2px;
    }
    .ribbon-toggle-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .ribbon-toggle-button.ribbon-item-large {
      flex-direction: column;
      padding: 6px 10px;
      min-width: 56px;
    }
    .ribbon-toggle-button.ribbon-item-large .ribbon-button-icon { font-size: 28px; }
    .ribbon-toggle-button.ribbon-item-medium { flex-direction: row; padding: 4px 8px; }
    .ribbon-toggle-button.ribbon-item-small {
      flex-direction: row;
      padding: 4px 6px;
      width: 100%;
      justify-content: flex-start;
    }
    .ribbon-button-icon { line-height: 1; font-size: 16px; }
    .ribbon-button-label { white-space: nowrap; }
  `;

  @property({ type: Boolean, reflect: true })
  pressed: boolean = false;

  override render(): TemplateResult {
    return html`
      <button
        class="ribbon-toggle-button ${this.getSizeClass()} ${this.pressed ? 'pressed' : ''}"
        ?disabled="${this.disabled}"
        aria-pressed="${this.pressed}"
        title="${this.tooltip || this.label}"
        @click="${this.onToggleClick}"
      >
        ${this.icon
          ? html`<span class="ribbon-button-icon">${this.icon}</span>`
          : ''}
        ${this.label
          ? html`<span class="ribbon-button-label">${this.label}</span>`
          : ''}
      </button>
    `;
  }

  private onToggleClick(): void {
    if (this.disabled) return;
    this.pressed = !this.pressed;
    this.dispatchEvent(
      new CustomEvent('toggle', {
        detail: { itemId: this.itemId, pressed: this.pressed },
        bubbles: true,
        composed: true,
      })
    );
  }
}

customElements.define('mp-ribbon-toggle-button', MpRibbonToggleButton);
