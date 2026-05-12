import { css, html, LitElement, nothing, type TemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';

export interface RibbonGroup {
  id: string;
  label: string;
}

export class MpRibbonGroup extends LitElement {
  static override styles = css`
    :host { display: inline-flex; position: relative; }
    :host::after {
      content: '';
      position: absolute;
      top: var(--bs-ribbon-group-separator-inset, 0px);
      bottom: var(--bs-ribbon-group-separator-inset, 0px);
      right: 0;
      width: 1px;
      background: var(--bs-ribbon-group-separator, rgba(0, 0, 0, 0.12));
      pointer-events: none;
    }
    :host([data-resolved-size="popup"])::after {
      top: var(--bs-ribbon-group-separator-inset, 0px);
      bottom: var(--bs-ribbon-group-separator-inset, 0px);
    }
    .ribbon-group {
      display: flex;
      flex-direction: column;
      padding: 2px 6px 0;
      min-width: 64px;
    }
    .ribbon-group-items {
      display: grid;
      grid-template-rows: repeat(3, auto);
      grid-auto-flow: column;
      column-gap: 4px;
      row-gap: 0;
      align-items: center;
      flex: 1;
    }
    ::slotted([size="large"]),
    ::slotted([size="medium"]) {
      grid-row: 1 / -1;
      align-self: stretch;
      justify-self: center;
    }
    ::slotted([size="small"]) {
      grid-row: span 1;
      align-self: center;
      justify-self: stretch;
      width: 100%;
      display: flex;
    }
    .ribbon-group-footer {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 2px;
      padding: 2px 0;
      position: relative;
    }
    .ribbon-group-label {
      font-size: 11px;
      line-height: 1;
      color: var(--bs-ribbon-group-label-color, #6c757d);
    }
    .ribbon-dialog-launcher {
      position: absolute;
      right: 0;
      background: transparent;
      border: none;
      cursor: pointer;
      padding: 0 2px;
      font-size: 11px;
      line-height: 1;
      color: var(--bs-ribbon-group-label-color, #6c757d);
    }
    .ribbon-dialog-launcher:hover {
      color: var(--bs-ribbon-app-accent, #0d6efd);
    }

    .ribbon-popup-trigger {
      display: none;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      background: transparent;
      border: 1px solid transparent;
      border-radius: var(--bs-ribbon-item-radius, 3px);
      cursor: pointer;
      padding: 6px 10px;
      min-width: 56px;
      font-size: 12px;
      color: inherit;
    }
    .ribbon-popup-trigger:hover {
      background: var(--bs-ribbon-item-hover-bg, #e9ecef);
      border-color: var(--bs-ribbon-item-hover-border, #ced4da);
    }
    .ribbon-popup-trigger:focus-visible {
      outline: 2px solid var(--bs-ribbon-app-accent, #0d6efd);
      outline-offset: -2px;
    }
    .ribbon-popup-trigger-icon { font-size: 22px; line-height: 1; }
    .ribbon-popup-trigger-label {
      display: flex;
      align-items: center;
      gap: 2px;
      white-space: nowrap;
    }
    .ribbon-popup-trigger-chevron { font-size: 9px; opacity: 0.6; }

    :host([data-resolved-size="popup"]) .ribbon-group { display: none; }
    :host([data-resolved-size="popup"]) .ribbon-popup-trigger { display: flex; }
    :host([data-resolved-size="popup"][data-popup-open]) .ribbon-group {
      display: flex;
      position: fixed;
      background: var(--bs-ribbon-tabpanel-bg, #fff);
      border: 1px solid var(--bs-ribbon-container-border, #d0d0d0);
      border-radius: 4px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18);
      padding: 4px 6px;
      z-index: 1050;
      min-width: 200px;
    }
  `;

  @property({ type: String, attribute: 'group-id' })
  groupId: string = '';

  @property({ type: String })
  label: string = '';

  @property({ type: String })
  icon: string = '';

  @property({ type: String, attribute: 'dialog-launcher' })
  dialogLauncher: string = '';

  @property({ type: String, attribute: 'data-resolved-size', reflect: true })
  resolvedSize: 'large' | 'medium' | 'small' | 'popup' | '' = '';

  @state()
  private popupOpen = false;

  @state()
  private popupLeft = 0;

  @state()
  private popupTop = 0;

  override connectedCallback() {
    super.connectedCallback();
    document.addEventListener('keydown', this.onKeyDown);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('mousedown', this.onDocMouseDown, true);
  }

  override updated(changed: Map<string, unknown>): void {
    if (changed.has('resolvedSize') && this.resolvedSize !== 'popup') {
      // If the group expanded back, ensure the popup is closed.
      if (this.popupOpen) this.closePopup();
    }
  }

  override render(): TemplateResult {
    const popupStyles = this.popupOpen
      ? { left: `${this.popupLeft}px`, top: `${this.popupTop}px` }
      : {};
    return html`
      <div
        class="ribbon-group"
        role="region"
        aria-label="${this.label}"
        style=${styleMap(popupStyles)}
      >
        <div class="ribbon-group-items">
          <slot></slot>
        </div>
        <div class="ribbon-group-footer">
          <span class="ribbon-group-label">${this.label}</span>
          ${this.dialogLauncher
            ? html`<button
                class="ribbon-dialog-launcher"
                title="${this.dialogLauncher}"
                aria-label="${this.dialogLauncher}"
                @click="${this.onDialogLauncherClick}"
              >⬘</button>`
            : nothing}
        </div>
      </div>
      <button
        class="ribbon-popup-trigger"
        aria-haspopup="true"
        aria-expanded="${this.popupOpen}"
        aria-label="${this.label}"
        title="${this.label}"
        @click="${this.onTriggerClick}"
      >
        ${this.icon
          ? html`<span class="ribbon-popup-trigger-icon">${this.icon}</span>`
          : nothing}
        <span class="ribbon-popup-trigger-label">
          ${this.label}
          <span class="ribbon-popup-trigger-chevron">▼</span>
        </span>
      </button>
    `;
  }

  private onTriggerClick = (event: MouseEvent): void => {
    event.stopPropagation();
    if (this.popupOpen) {
      this.closePopup();
    } else {
      this.openPopup();
    }
  };

  private async openPopup(): Promise<void> {
    this.popupOpen = true;
    this.setAttribute('data-popup-open', '');
    await this.updateComplete;
    this.positionPopup();
    // Defer so the click that opened the popup doesn't immediately close it.
    setTimeout(() => {
      document.addEventListener('mousedown', this.onDocMouseDown, true);
    }, 0);
  }

  private closePopup(): void {
    this.popupOpen = false;
    this.removeAttribute('data-popup-open');
    document.removeEventListener('mousedown', this.onDocMouseDown, true);
  }

  private positionPopup(): void {
    const trigger = this.renderRoot.querySelector<HTMLElement>(
      '.ribbon-popup-trigger'
    );
    const group = this.renderRoot.querySelector<HTMLElement>('.ribbon-group');
    if (!trigger || !group) return;

    const triggerRect = trigger.getBoundingClientRect();
    const groupRect = group.getBoundingClientRect();
    const vw = window.innerWidth;
    const margin = 8;

    let left = triggerRect.left;
    if (left + groupRect.width > vw - margin) {
      left = vw - groupRect.width - margin;
    }
    if (left < margin) left = margin;

    const top = triggerRect.bottom + 4;

    this.popupLeft = left;
    this.popupTop = top;
  }

  private onDocMouseDown = (event: MouseEvent): void => {
    const path = event.composedPath();
    if (path.includes(this)) return;
    this.closePopup();
  };

  private onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && this.popupOpen) {
      this.closePopup();
      const trigger = this.renderRoot.querySelector<HTMLElement>(
        '.ribbon-popup-trigger'
      );
      trigger?.focus();
      event.preventDefault();
    }
  };

  private onDialogLauncherClick(): void {
    this.dispatchEvent(
      new CustomEvent('dialog-launcher-click', {
        detail: { groupId: this.groupId },
        bubbles: true,
        composed: true,
      })
    );
  }
}

customElements.define('mp-ribbon-group', MpRibbonGroup);
