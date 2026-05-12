import { css, html, type TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { MpRibbonItemBase, RIBBON_ICON_SLOT_STYLES } from './mp-ribbon-item-base';

/**
 * mp-ribbon-button — Simple button item.
 * Renders a button with label and optional icon.
 */
export class MpRibbonButton extends MpRibbonItemBase {
  static override styles = [RIBBON_ICON_SLOT_STYLES, css`
    :host { display: inline-flex; }
    :host([size="small"]) { display: flex; width: 100%; }
    .ribbon-button {
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
      padding: 4px 6px;
      min-width: 28px;
    }
    .ribbon-button:hover {
      background: var(--bs-ribbon-item-hover-bg, #e9ecef);
      border-color: var(--bs-ribbon-item-hover-border, #ced4da);
    }
    .ribbon-button:active {
      background: var(--bs-ribbon-item-pressed-bg, #dee2e6);
    }
    .ribbon-button:focus-visible {
      outline: 2px solid var(--bs-ribbon-app-accent, #0d6efd);
      outline-offset: -2px;
    }
    .ribbon-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .ribbon-button.ribbon-item-large {
      flex-direction: column;
      padding: 6px 10px;
      min-width: 56px;
    }
    .ribbon-button.ribbon-item-large .ribbon-button-icon { font-size: 28px; }
    .ribbon-button.ribbon-item-medium { flex-direction: row; padding: 4px 8px; }
    .ribbon-button.ribbon-item-small {
      flex-direction: row;
      padding: 4px 6px;
      width: 100%;
      justify-content: flex-start;
    }
    .ribbon-button-icon { line-height: 1; font-size: 16px; }
    .ribbon-button-label { white-space: nowrap; }
  `];

  override render(): TemplateResult {
    return html`
      <button
        class="ribbon-button ${this.getSizeClass()}"
        ?disabled="${this.disabled}"
        title="${this.tooltip || this.label}"
      >
        <span class="ribbon-button-icon">
          <slot name="icon">${this.icon ? this.icon : ''}</slot>
        </span>
        ${this.label ? html`<span class="ribbon-button-label">${this.label}</span>` : ''}
      </button>
    `;
  }
}

customElements.define('mp-ribbon-button', MpRibbonButton);
