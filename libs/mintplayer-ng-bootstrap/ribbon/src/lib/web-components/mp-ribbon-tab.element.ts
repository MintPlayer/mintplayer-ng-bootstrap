import { css, html, LitElement, type TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';

/**
 * mp-ribbon-tab — One tab of a ribbon. Becomes the tabpanel for its content.
 *
 * Hosted inside `<mp-ribbon>` as a light-DOM child. The parent ribbon reads
 * the slotted `<mp-ribbon-tab>` elements to build the tab strip, and sets the
 * `active` attribute on the currently selected tab. Inactive tabs are
 * `display: none`.
 */
export class MpRibbonTab extends LitElement {
  static override styles = css`
    :host {
      display: none;
      width: 100%;
    }
    :host([active]) {
      display: flex;
      flex-wrap: nowrap;
      gap: 8px;
      align-items: stretch;
      min-width: 0;
    }
    ::slotted(*) { flex: 0 0 auto; }
  `;

  @property({ type: String, attribute: 'tab-id', reflect: true })
  tabId: string = '';

  @property({ type: String, reflect: true })
  label: string = '';

  @property({ type: Boolean, reflect: true })
  active: boolean = false;

  override connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'tabpanel');
  }

  override updated(changed: Map<string, unknown>): void {
    if (changed.has('tabId') && this.tabId) {
      this.id = `ribbon-panel-${this.tabId}`;
      this.setAttribute('aria-labelledby', `ribbon-tab-${this.tabId}`);
    }
  }

  override render(): TemplateResult {
    return html`<slot></slot>`;
  }
}

customElements.define('mp-ribbon-tab', MpRibbonTab);
