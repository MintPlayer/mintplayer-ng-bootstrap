import { html, LitElement, type TemplateResult } from 'lit';
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
  static override styles = [];

  /** Unique identifier for this group */
  @property({ type: String })
  groupId: string = '';

  /** Display label for the group */
  @property({ type: String })
  label: string = '';

  /** Optional dialog launcher button label (e.g. "Font Dialog") */
  @property({ type: String })
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
