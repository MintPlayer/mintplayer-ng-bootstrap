import { css, html, LitElement, nothing, type TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';

export class MpRibbonMenuItem extends LitElement {
  static override shadowRootOptions: ShadowRootInit = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  static override styles = css`
    :host { display: block; }
    .menu-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      background: transparent;
      border: none;
      cursor: pointer;
      color: inherit;
      font-size: 13px;
      font-family: inherit;
      width: 100%;
      text-align: left;
      white-space: nowrap;
    }
    .menu-item:hover:not(:disabled),
    .menu-item:focus-visible {
      background: var(--bs-ribbon-item-hover-bg, #e9ecef);
      outline: none;
    }
    .menu-item:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    @media (pointer: coarse) {
      .menu-item {
        min-height: 44px;
        padding: 10px 14px;
      }
    }
    .menu-item-check {
      width: 14px;
      flex: 0 0 auto;
      text-align: center;
      font-size: 11px;
      line-height: 1;
    }
    .menu-item-icon {
      width: 16px;
      text-align: center;
      flex: 0 0 auto;
      line-height: 1;
    }
    .menu-item-label { flex: 1; }
  `;

  @property({ type: String, attribute: 'item-id' })
  itemId = '';

  @property({ type: String })
  label = '';

  @property({ type: String })
  icon = '';

  @property({ type: String })
  kind: 'action' | 'checkbox' | 'radio' = 'action';

  @property({ type: Boolean })
  checked = false;

  @property({ type: Boolean })
  disabled = false;

  override render(): TemplateResult {
    const role =
      this.kind === 'checkbox'
        ? 'menuitemcheckbox'
        : this.kind === 'radio'
          ? 'menuitemradio'
          : 'menuitem';
    return html`
      <button
        class="menu-item"
        role="${role}"
        aria-checked="${this.kind === 'action' ? nothing : String(this.checked)}"
        ?disabled="${this.disabled}"
        @click="${this.onActivate}"
      >
        ${this.kind !== 'action'
          ? html`<span class="menu-item-check">${this.checked ? '✓' : ''}</span>`
          : nothing}
        <span class="menu-item-icon">
          <slot name="icon">${this.icon ? this.icon : ''}</slot>
        </span>
        <span class="menu-item-label">${this.label}</span>
      </button>
    `;
  }

  private onActivate(): void {
    if (this.disabled) return;
    if (this.kind === 'checkbox') {
      this.checked = !this.checked;
    } else if (this.kind === 'radio') {
      this.checked = true;
    }
    this.dispatchEvent(
      new CustomEvent('menu-select', {
        detail: { itemId: this.itemId, checked: this.checked },
        bubbles: true,
        composed: true,
      })
    );
  }
}

customElements.define('mp-ribbon-menu-item', MpRibbonMenuItem);
