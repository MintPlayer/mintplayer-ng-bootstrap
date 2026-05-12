import { css, html, type TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { MpRibbonItemBase } from './mp-ribbon-item-base';

/**
 * mp-ribbon-color-picker — wraps a native `<input type="color">` so the
 * browser's colour palette UI is used without re-implementing one.
 */
export class MpRibbonColorPicker extends MpRibbonItemBase {
  static override styles = css`
    :host { display: inline-flex; align-items: center; }
    :host([size="small"]) { display: flex; width: 100%; }
    .ribbon-color-picker {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 6px;
      cursor: pointer;
      border-radius: var(--bs-ribbon-item-radius, 3px);
      color: inherit;
      font-size: 12px;
      font-family: inherit;
      border: 1px solid transparent;
    }
    .ribbon-color-picker.large {
      flex-direction: column;
      padding: 6px 10px;
    }
    .ribbon-color-picker.small { width: 100%; }
    .ribbon-color-picker:hover:not(.disabled) {
      background: var(--bs-ribbon-item-hover-bg, #e9ecef);
      border-color: var(--bs-ribbon-item-hover-border, #ced4da);
    }
    .ribbon-color-picker.disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .ribbon-color-picker-input {
      width: 22px;
      height: 16px;
      padding: 0;
      border: 1px solid var(--bs-ribbon-item-hover-border, #ced4da);
      border-radius: 2px;
      cursor: inherit;
      background: transparent;
      flex: 0 0 auto;
    }
    .ribbon-color-picker.large .ribbon-color-picker-input {
      width: 36px;
      height: 28px;
    }
    .ribbon-color-picker-label { white-space: nowrap; }
  `;

  @property({ type: String, reflect: true })
  color: string = '#000000';

  override render(): TemplateResult {
    const sizeClass =
      this.size === 'large' ? 'large' : this.size === 'small' ? 'small' : 'medium';
    return html`
      <label
        class="ribbon-color-picker ${sizeClass} ${this.disabled ? 'disabled' : ''}"
        title="${this.tooltip || this.label}"
      >
        <input
          type="color"
          class="ribbon-color-picker-input"
          .value="${this.color}"
          ?disabled="${this.disabled}"
          aria-label="${this.label}"
          @input="${this.onColorChange}"
        />
        ${this.label
          ? html`<span class="ribbon-color-picker-label">${this.label}</span>`
          : ''}
      </label>
    `;
  }

  private onColorChange(event: Event): void {
    if (this.disabled) return;
    const target = event.target as HTMLInputElement;
    this.color = target.value;
    this.dispatchEvent(
      new CustomEvent('color-change', {
        detail: { itemId: this.itemId, color: this.color },
        bubbles: true,
        composed: true,
      })
    );
  }
}

customElements.define('mp-ribbon-color-picker', MpRibbonColorPicker);
