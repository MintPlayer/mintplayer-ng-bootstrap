import { LitElement, html, css, type TemplateResult } from 'lit';

/**
 * <mp-tab-page>
 *
 * Optional convenience wrapper for vanilla consumers. Sets `slot="${tabId}-content"`
 * on itself based on its `tab-id` attribute, so the parent `<mp-tab-control>`
 * picks it up via named-slot projection.
 *
 * Also mirrors `disabled` to `data-disabled` so the tab-control can read the
 * disabled state without inspecting child types.
 *
 * Use directly:
 *
 *     <mp-tab-control>
 *       <span slot="t1-header">Tab 1</span>
 *       <mp-tab-page tab-id="t1">Content 1</mp-tab-page>
 *     </mp-tab-control>
 *
 * Or skip this element entirely and put the slot/data-disabled attributes
 * directly on whatever element holds your tab content:
 *
 *     <mp-tab-control>
 *       <span slot="t1-header">Tab 1</span>
 *       <div slot="t1-content">Content 1</div>
 *     </mp-tab-control>
 */
export class MpTabPage extends LitElement {
  static override styles = css`
    :host {
      display: block;
    }
  `;

  static override get observedAttributes(): string[] {
    return [
      ...(super.observedAttributes ?? []),
      'tab-id',
      'disabled',
    ];
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.syncSlot();
    this.syncDisabled();
  }

  override attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    super.attributeChangedCallback(name, oldValue, newValue);
    if (oldValue === newValue) return;
    if (name === 'tab-id') this.syncSlot();
    if (name === 'disabled') this.syncDisabled();
  }

  private syncSlot(): void {
    const tabId = this.getAttribute('tab-id');
    if (tabId) {
      this.setAttribute('slot', `${tabId}-content`);
    } else {
      this.removeAttribute('slot');
    }
  }

  private syncDisabled(): void {
    if (this.hasAttribute('disabled')) {
      this.setAttribute('data-disabled', '');
    } else {
      this.removeAttribute('data-disabled');
    }
  }

  override render(): TemplateResult {
    return html`<slot></slot>`;
  }
}

if (
  typeof customElements !== 'undefined' &&
  !customElements.get('mp-tab-page')
) {
  customElements.define('mp-tab-page', MpTabPage);
}
