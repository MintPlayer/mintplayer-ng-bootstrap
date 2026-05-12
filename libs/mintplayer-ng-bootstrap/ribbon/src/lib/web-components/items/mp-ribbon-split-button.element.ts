import { css, html, type TemplateResult } from 'lit';
import { query } from 'lit/decorators.js';
import { MpRibbonItemBase } from './mp-ribbon-item-base';
import { OverlayController } from '../overlay-controller';

/**
 * mp-ribbon-split-button — Two adjacent buttons: main action + chevron.
 * Main click dispatches `main-action` (and the inherited `item-click` from
 * the base class). Chevron toggles a `<slot name="menu">` overlay.
 *
 * Per WAI-ARIA APG menu-button pattern, both halves are real buttons
 * wrapped in `role="group"` — there is no standard `role="splitbutton"`.
 */
export class MpRibbonSplitButton extends MpRibbonItemBase {
  static override styles = css`
    :host { display: inline-flex; position: relative; }
    .ribbon-split-button {
      display: inline-flex;
      align-items: stretch;
      border: 1px solid transparent;
      border-radius: var(--bs-ribbon-item-radius, 3px);
      overflow: hidden;
    }
    .ribbon-split-button:hover {
      border-color: var(--bs-ribbon-item-hover-border, #ced4da);
    }
    .ribbon-split-button-main,
    .ribbon-split-button-dropdown {
      background: transparent;
      border: none;
      cursor: pointer;
      color: inherit;
      font-size: 12px;
      font-family: inherit;
    }
    .ribbon-split-button-main {
      display: inline-flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
      padding: 4px 6px;
      min-width: 28px;
    }
    .ribbon-split-button-dropdown {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0 4px;
      border-left: 1px solid transparent;
      min-width: 16px;
      font-size: 9px;
    }
    .ribbon-split-button-main:hover:not(:disabled),
    .ribbon-split-button-dropdown:hover:not(:disabled) {
      background: var(--bs-ribbon-item-hover-bg, #e9ecef);
    }
    .ribbon-split-button-main:hover:not(:disabled) + .ribbon-split-button-dropdown {
      border-left-color: var(--bs-ribbon-item-hover-border, #ced4da);
    }
    .ribbon-split-button-main:focus-visible,
    .ribbon-split-button-dropdown:focus-visible {
      outline: 2px solid var(--bs-ribbon-app-accent, #0d6efd);
      outline-offset: -2px;
    }
    .ribbon-split-button-main:disabled,
    .ribbon-split-button-dropdown:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .ribbon-button-icon { line-height: 1; font-size: 16px; }
    .ribbon-button-label { white-space: nowrap; }

    :host(.ribbon-item-large) .ribbon-split-button {
      flex-direction: column;
    }
    :host(.ribbon-item-large) .ribbon-split-button-main {
      padding: 6px 10px;
      min-width: 56px;
    }
    :host(.ribbon-item-large) .ribbon-split-button-main .ribbon-button-icon {
      font-size: 28px;
    }
    :host(.ribbon-item-large) .ribbon-split-button-dropdown {
      border-left: none;
      border-top: 1px solid transparent;
      padding: 2px 0;
      min-width: 0;
    }
    :host(.ribbon-item-large) .ribbon-split-button-main:hover:not(:disabled) + .ribbon-split-button-dropdown {
      border-left-color: transparent;
      border-top-color: var(--bs-ribbon-item-hover-border, #ced4da);
    }

    .menu-panel {
      position: fixed;
      z-index: 1050;
      background: var(--bs-ribbon-tabpanel-bg, #fff);
      color: var(--bs-body-color, #212529);
      border: 1px solid var(--bs-ribbon-container-border, #d0d0d0);
      border-radius: 4px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18);
      padding: 4px 0;
      display: none;
      min-width: 180px;
      max-width: 320px;
    }
    :host([data-menu-open]) .menu-panel { display: block; }
  `;

  @query('.ribbon-split-button')
  private groupEl!: HTMLElement;

  @query('.ribbon-split-button-dropdown')
  private chevronEl!: HTMLElement;

  @query('.menu-panel')
  private panelEl!: HTMLElement;

  private overlay = new OverlayController(this, {
    trigger: () => this.chevronEl,
    panel: () => this.panelEl,
    onOpen: () => this.emitMenuToggle(true),
    onClose: () => this.emitMenuToggle(false),
  });

  override render(): TemplateResult {
    return html`
      <div
        class="ribbon-split-button ${this.getSizeClass()}"
        role="group"
        aria-label="${this.label}"
      >
        <button
          class="ribbon-split-button-main"
          ?disabled="${this.disabled}"
          title="${this.tooltip || this.label}"
          @click="${this.onMainClick}"
        >
          ${this.icon
            ? html`<span class="ribbon-button-icon">${this.icon}</span>`
            : ''}
          ${this.label
            ? html`<span class="ribbon-button-label">${this.label}</span>`
            : ''}
        </button>
        <button
          class="ribbon-split-button-dropdown"
          ?disabled="${this.disabled}"
          aria-label="${this.label} options"
          aria-haspopup="menu"
          aria-expanded="${this.overlay.isOpen}"
          @click="${this.onChevronClick}"
          @keydown="${this.onChevronKeyDown}"
        >▼</button>
      </div>
      <div class="menu-panel" role="menu" @click="${this.onMenuClick}">
        <slot name="menu"></slot>
      </div>
    `;
  }

  private onMainClick = (event: MouseEvent): void => {
    if (this.disabled) return;
    event.stopPropagation();
    this.dispatchEvent(
      new CustomEvent('main-action', {
        detail: { itemId: this.itemId },
        bubbles: true,
        composed: true,
      })
    );
    // Also emit the base item-click so consumers using the simple event still work.
    this.dispatchEvent(
      new CustomEvent('item-click', {
        detail: { itemId: this.itemId },
        bubbles: true,
        composed: true,
      })
    );
  };

  private onChevronClick = async (event: MouseEvent): Promise<void> => {
    if (this.disabled) return;
    event.stopPropagation();
    await this.overlay.toggle();
  };

  private onChevronKeyDown = async (event: KeyboardEvent): Promise<void> => {
    if (this.disabled) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!this.overlay.isOpen) await this.overlay.open();
    }
  };

  private onMenuClick = (event: Event): void => {
    const target = event.target as HTMLElement;
    if (
      target.closest(
        'mp-ribbon-menu-item, [role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"]'
      )
    ) {
      this.overlay.close();
    }
  };

  private emitMenuToggle(open: boolean): void {
    this.dispatchEvent(
      new CustomEvent('menu-toggle', {
        detail: { itemId: this.itemId, open },
        bubbles: true,
        composed: true,
      })
    );
  }
}

customElements.define('mp-ribbon-split-button', MpRibbonSplitButton);
