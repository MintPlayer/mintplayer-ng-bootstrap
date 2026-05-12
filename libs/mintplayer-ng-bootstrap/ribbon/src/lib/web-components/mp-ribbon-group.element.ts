import { css, html, LitElement, type TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';

export interface RibbonGroup {
  id: string;
  label: string;
}

/**
 * mp-ribbon-group — Group container within a ribbon tab.
 *
 * Renders a labeled group with optional dialog launcher button and
 * a slot for item children (Button, SplitButton, etc.).
 *
 * Phase 2: Groups + item composition
 */
export class MpRibbonGroup extends LitElement {
  static override styles = css`
    :host { display: inline-flex; }
    .ribbon-group {
      display: flex;
      flex-direction: column;
      padding: 4px 8px;
      border-right: 1px solid var(--bs-border-color, #e0e0e0);
      min-width: 64px;
    }
    .ribbon-group-items {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      align-items: flex-start;
      flex: 1;
      padding: 4px 0;
    }
    .ribbon-group-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 4px;
      border-top: 1px solid var(--bs-border-color, #e0e0e0);
      padding-top: 4px;
      margin-top: 4px;
    }
    .ribbon-group-label {
      font-size: 11px;
      color: var(--bs-secondary-color, #6c757d);
    }
    .ribbon-dialog-launcher {
      background: transparent;
      border: none;
      cursor: pointer;
      padding: 2px 4px;
      font-size: 12px;
      color: var(--bs-secondary-color, #6c757d);
    }
    .ribbon-dialog-launcher:hover { color: var(--bs-primary, #0d6efd); }
  `;

  /** Unique identifier for this group */
  @property({ type: String, attribute: 'group-id' })
  groupId: string = '';

  /** Display label for the group */
  @property({ type: String })
  label: string = '';

  /** Optional dialog launcher button label (e.g. "Font Dialog") */
  @property({ type: String, attribute: 'dialog-launcher' })
  dialogLauncher: string = '';

  constructor() {
    super();
  }

  override render(): TemplateResult {
    return html`
      <div class="ribbon-group" role="region" aria-label="${this.label}">
        <!-- Group header with label + optional dialog launcher -->
        <div class="ribbon-group-header">
          <span class="ribbon-group-label">${this.label}</span>
          ${this.dialogLauncher ? html`
            <button
              class="ribbon-dialog-launcher"
              title="${this.dialogLauncher}"
              aria-label="${this.dialogLauncher}"
              @click="${this.onDialogLauncherClick}"
            >
              ⬘
            </button>
          ` : ''}
        </div>

        <!-- Items container with slot -->
        <div class="ribbon-group-items">
          <slot></slot>
        </div>
      </div>
    `;
  }

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
