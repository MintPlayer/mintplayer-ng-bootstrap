import { LitElement, html, nothing, type TemplateResult } from 'lit';
import { timelineItemStyles } from '../styles';

/**
 * `<mp-timeline-item>` — one row of a `<mp-timeline>`.
 *
 * It renders its **own** row (marker / content / opposite + a trailing
 * connector) in its own shadow DOM, fed by named slots with attribute
 * fallbacks. There is exactly one shadow boundary between authored content and
 * its rendered region, so render-props / scoped-slots / plain HTML all project
 * cleanly (and SSR via DSD).
 *
 * Authoring (vanilla):
 *
 *     <mp-timeline-item item-id="ship" title="Shipped" color="#198754">
 *       <i slot="marker" class="bi bi-check"></i>
 *       <small slot="opposite">2026-05-01</small>
 *       Released the first public build.
 *     </mp-timeline-item>
 *
 * Layout state (`side`, `last`, `orientation`) and selection state
 * (`selected`, `aria-selected`, `tabindex`, `role`) are owned by the parent
 * `<mp-timeline>` — it sets them on the item. The item only reads its own data
 * attributes for the default rendering.
 */
export class MpTimelineItem extends LitElement {
  static override styles = [timelineItemStyles];

  static override get observedAttributes(): string[] {
    return [
      ...(super.observedAttributes ?? []),
      // Data attributes (mirror TimelineItem fields).
      'item-id',
      'title',
      'description',
      'time',
      'icon',
      'color',
      'disabled',
      'item-class',
      'selected',
      // Parent-managed layout attributes.
      'side',
      'orientation',
      'last',
    ];
  }

  override connectedCallback(): void {
    super.connectedCallback();
    // Default semantics for standalone / declarative use; the parent upgrades
    // this to `option` when the timeline is selectable.
    if (!this.hasAttribute('role')) this.setAttribute('role', 'listitem');
  }

  override attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    super.attributeChangedCallback(name, oldValue, newValue);
    if (oldValue === newValue) return;
    this.requestUpdate();
  }

  /** Mirror the per-item accent colour onto a CSS custom property. */
  protected override updated(): void {
    const color = this.getAttribute('color');
    if (color) this.style.setProperty('--mp-tl-item-color', color);
    else this.style.removeProperty('--mp-tl-item-color');
  }

  override render(): TemplateResult {
    const icon = this.getAttribute('icon');
    const title = this.getAttribute('title');
    const description = this.getAttribute('description');
    const time = this.getAttribute('time');
    const itemClass = this.getAttribute('item-class');

    return html`
      <div class="item ${itemClass ?? ''}">
        <div class="opposite">
          <slot name="opposite"><slot name="timestamp">${time ?? nothing}</slot></slot>
        </div>
        <div class="line">
          <span class="marker">
            <slot name="marker">
              <span class="marker-dot">
                ${icon ? html`<i class=${icon} aria-hidden="true"></i>` : nothing}
              </span>
            </slot>
          </span>
          <span class="connector"><slot name="connector"></slot></span>
        </div>
        <div class="content">
          <div class="title"><slot name="title">${title ?? nothing}</slot></div>
          <div class="body">
            <slot><slot name="content">${description ?? nothing}</slot></slot>
          </div>
        </div>
      </div>
    `;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('mp-timeline-item')) {
  customElements.define('mp-timeline-item', MpTimelineItem);
}

declare global {
  interface HTMLElementTagNameMap {
    'mp-timeline-item': MpTimelineItem;
  }
}
