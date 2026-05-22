import { css, html, type TemplateResult } from 'lit';
import { query } from 'lit/decorators.js';
import { MpRibbonItemBase, RIBBON_ICON_SLOT_STYLES } from './mp-ribbon-item-base';
import { OverlayController } from '@mintplayer/ng-bootstrap/web-components/overlay';

/**
 * mp-ribbon-dropdown-button — Single button + chevron. Click opens a menu
 * overlay built from `<slot name="menu">` children.
 */
export class MpRibbonDropdownButton extends MpRibbonItemBase {
  static override styles = [RIBBON_ICON_SLOT_STYLES, css`
    :host { display: inline-flex; position: relative; }
    :host([size="small"]) { display: flex; width: 100%; }
    .ribbon-dropdown-button {
      display: inline-flex;
      flex-direction: row;
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
    .ribbon-dropdown-button.ribbon-item-large {
      flex-direction: column;
      padding: 6px 10px;
      min-width: 56px;
    }
    .ribbon-dropdown-button.ribbon-item-large .ribbon-button-icon { font-size: 28px; }
    .ribbon-dropdown-button.ribbon-item-medium { padding: 4px 8px; }
    .ribbon-dropdown-button.ribbon-item-small {
      padding: 4px 6px;
      width: 100%;
      justify-content: flex-start;
    }
    .ribbon-dropdown-button.ribbon-item-small .ribbon-button-label {
      flex: 1;
      justify-content: space-between;
    }
    .ribbon-dropdown-button:hover:not(:disabled) {
      background: var(--bs-ribbon-item-hover-bg, #e9ecef);
      border-color: var(--bs-ribbon-item-hover-border, #ced4da);
    }
    .ribbon-dropdown-button:focus-visible {
      outline: 2px solid var(--bs-ribbon-app-accent, #0d6efd);
      outline-offset: -2px;
    }
    .ribbon-dropdown-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .ribbon-button-icon { line-height: 1; font-size: 16px; }
    .ribbon-button-label {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      white-space: nowrap;
    }
    .ribbon-dropdown-arrow { font-size: 9px; opacity: 0.6; }

    .menu-panel {
      position: fixed;
      z-index: 1050;
      background: var(--bs-ribbon-tabpanel-bg, #fff);
      color: inherit;
      border: 1px solid var(--bs-ribbon-container-border, #d0d0d0);
      border-radius: 4px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18);
      padding: 4px 0;
      display: none;
      min-width: 180px;
      max-width: min(320px, calc(100vw - 16px));
    }
    :host([data-menu-open]) .menu-panel { display: block; }
  `];

  @query('.ribbon-dropdown-button')
  private triggerEl!: HTMLElement;

  @query('.menu-panel')
  private panelEl!: HTMLElement;

  private overlay = new OverlayController(this, {
    anchor: () => this.triggerEl,
    panel: () => this.panelEl,
    onOpen: () => {
      this.dispatchEvent(
        new CustomEvent('menu-toggle', {
          detail: { itemId: this.itemId, open: true },
          bubbles: true,
          composed: true,
        })
      );
    },
    onClose: () => {
      this.dispatchEvent(
        new CustomEvent('menu-toggle', {
          detail: { itemId: this.itemId, open: false },
          bubbles: true,
          composed: true,
        })
      );
    },
  });

  override render(): TemplateResult {
    return html`
      <button
        class="ribbon-dropdown-button ${this.getSizeClass()}"
        ?disabled="${this.disabled}"
        title="${this.tooltip || this.label}"
        aria-haspopup="menu"
        aria-expanded="${this.overlay.isOpen}"
        @click="${this.onTriggerClick}"
        @keydown="${this.onTriggerKeyDown}"
      >
        <span class="ribbon-button-icon">
          <slot name="icon">${this.icon ? this.icon : ''}</slot>
        </span>
        <span class="ribbon-button-label">
          ${this.label ? html`<span>${this.label}</span>` : ''}
          <span class="ribbon-dropdown-arrow">▼</span>
        </span>
      </button>
      <div class="menu-panel" role="menu" @click="${this.onMenuClick}">
        <slot name="menu"></slot>
      </div>
    `;
  }

  private onTriggerClick = async (event: MouseEvent): Promise<void> => {
    if (this.disabled) return;
    event.stopPropagation();
    await this.overlay.toggle();
  };

  private onTriggerKeyDown = async (event: KeyboardEvent): Promise<void> => {
    if (this.disabled) return;
    if (
      event.key === 'ArrowDown' ||
      (event.key === 'ArrowDown' && event.altKey)
    ) {
      event.preventDefault();
      if (!this.overlay.isOpen) await this.overlay.open();
    }
  };

  private onMenuClick = (event: Event): void => {
    const target = event.target as HTMLElement;
    if (target.closest('mp-ribbon-menu-item, [role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"]')) {
      this.overlay.close();
    }
  };
}

customElements.define('mp-ribbon-dropdown-button', MpRibbonDropdownButton);
