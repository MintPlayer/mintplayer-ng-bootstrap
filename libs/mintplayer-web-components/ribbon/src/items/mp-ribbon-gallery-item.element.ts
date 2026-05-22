import { css, html, LitElement, type TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { RIBBON_ICON_SLOT_STYLES } from './mp-ribbon-item-base';

/**
 * mp-ribbon-gallery-item — One cell inside a `mp-ribbon-gallery`. Renders an
 * icon or label as a clickable tile and emits `gallery-select` on activation.
 */
export class MpRibbonGalleryItem extends LitElement {
  static override styles = [RIBBON_ICON_SLOT_STYLES, css`
    :host { display: inline-flex; }
    .gallery-item {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      cursor: pointer;
      background: transparent;
      border: 1px solid transparent;
      border-radius: 2px;
      color: inherit;
      font-size: 14px;
      font-family: inherit;
    }
    .gallery-item:hover:not(:disabled):not(.selected) {
      background: var(--bs-ribbon-item-hover-bg, #e9ecef);
      border-color: var(--bs-ribbon-item-hover-border, #ced4da);
    }
    .gallery-item.selected {
      background: var(--bs-ribbon-item-pressed-bg, #dee2e6);
      border-color: var(--bs-ribbon-app-accent, #0d6efd);
    }
    .gallery-item:focus-visible {
      outline: 2px solid var(--bs-ribbon-app-accent, #0d6efd);
      outline-offset: -2px;
    }
    .gallery-item:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `];

  @property({ type: String, attribute: 'item-id' })
  itemId: string = '';

  @property({ type: String })
  label: string = '';

  @property({ type: String })
  icon: string = '';

  @property({ type: Boolean, reflect: true })
  selected: boolean = false;

  @property({ type: Boolean })
  disabled: boolean = false;

  override render(): TemplateResult {
    return html`
      <button
        class="gallery-item ${this.selected ? 'selected' : ''}"
        ?disabled="${this.disabled}"
        role="option"
        aria-selected="${this.selected}"
        aria-label="${this.label}"
        title="${this.label}"
        @click="${this.onClick}"
      >
        <slot name="icon">
          ${this.icon
            ? html`<span>${this.icon}</span>`
            : html`<span>${this.label}</span>`}
        </slot>
      </button>
    `;
  }

  private onClick(): void {
    if (this.disabled) return;
    this.dispatchEvent(
      new CustomEvent('gallery-select', {
        detail: { itemId: this.itemId },
        bubbles: true,
        composed: true,
      })
    );
  }
}

customElements.define('mp-ribbon-gallery-item', MpRibbonGalleryItem);
