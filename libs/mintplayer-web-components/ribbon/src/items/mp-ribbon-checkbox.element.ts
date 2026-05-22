import { css, html, type TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { MpRibbonItemBase } from './mp-ribbon-item-base';
/**
 * mp-ribbon-checkbox — Native checkbox + label, sized to fit a small ribbon row.
 */
export class MpRibbonCheckBox extends MpRibbonItemBase {
  static override styles = css`
    :host { display: inline-flex; align-items: center; }
    :host([size="small"]) { display: flex; width: 100%; }
    .ribbon-checkbox {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      cursor: pointer;
      color: inherit;
      font-size: 12px;
      font-family: inherit;
      padding: 4px 6px;
      border-radius: var(--bs-ribbon-item-radius, 3px);
      user-select: none;
    }
    .ribbon-checkbox:hover:not(.disabled) {
      background: var(--bs-ribbon-item-hover-bg, #e9ecef);
    }
    .ribbon-checkbox.disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .ribbon-checkbox input {
      margin: 0;
      cursor: inherit;
      accent-color: var(--bs-ribbon-app-accent, #0d6efd);
    }
    .ribbon-checkbox.ribbon-item-small {
      width: 100%;
    }
    .ribbon-checkbox-label { white-space: nowrap; }
  `;

  @property({ type: Boolean, reflect: true })
  checked: boolean = false;

  override render(): TemplateResult {
    return html`
      <label
        class="ribbon-checkbox ${this.getSizeClass()} ${this.disabled ? 'disabled' : ''}"
        title="${this.tooltip || this.label}"
      >
        <input
          type="checkbox"
          ?checked="${this.checked}"
          ?disabled="${this.disabled}"
          @change="${this.onCheckChange}"
        />
        <span class="ribbon-checkbox-label">${this.label}</span>
      </label>
    `;
  }

  private onCheckChange(event: Event): void {
    if (this.disabled) return;
    const target = event.target as HTMLInputElement;
    this.checked = target.checked;
    this.dispatchEvent(
      new CustomEvent('check-change', {
        detail: { itemId: this.itemId, checked: this.checked },
        bubbles: true,
        composed: true,
      })
    );
  }
}

customElements.define('mp-ribbon-checkbox', MpRibbonCheckBox);
