import { LitElement, html, nothing, type TemplateResult } from 'lit';
import { timelineItemStyles } from '../styles';

/**
 * `<mp-timeline-item>` — one row of a `<mp-timeline>`.
 *
 * Renders its **own** row (marker / content / opposite + a trailing connector)
 * in its own shadow DOM, fed by named slots with attribute fallbacks. One
 * shadow boundary between authored content and its rendered region, so
 * render-props / scoped-slots / plain HTML all project cleanly (and SSR via
 * DSD).
 *
 * Authoring (vanilla):
 *
 *     <mp-timeline-item item-id="ship" title="Shipped" color="#198754">
 *       <i slot="marker" class="bi bi-check"></i>
 *       <small slot="opposite">2026-05-01</small>
 *       Released the first public build.
 *     </mp-timeline-item>
 *
 * Data fields are exposed as both attributes and properties. Layout state
 * (`side`, `last`, `orientation`) is set as attributes by the parent
 * `<mp-timeline>` and consumed by CSS.
 */
export class MpTimelineItem extends LitElement {
  static override styles = [timelineItemStyles];

  static override get observedAttributes(): string[] {
    return [
      ...(super.observedAttributes ?? []),
      'item-id',
      'title',
      'description',
      'time',
      'icon',
      'color',
      'disabled',
      'item-class',
      'selected',
      // Parent-managed layout attributes (CSS-only; no backing property).
      'side',
      'orientation',
      'last',
    ];
  }

  private _itemId: string | number | null = null;
  private _title: string | null = null;
  private _description: string | null = null;
  private _time: string | null = null;
  private _icon: string | null = null;
  private _color: string | null = null;
  private _itemClass: string | null = null;
  private _disabled = false;
  private _selected = false;

  get itemId(): string | number | null {
    return this._itemId;
  }
  set itemId(value: string | number | null) {
    const next = value ?? null;
    if (this._itemId === next) return;
    this._itemId = next;
    this.reflectString('item-id', next === null ? null : String(next));
  }

  // `title` is intentionally NOT redefined: the native HTMLElement.title
  // property already reflects to the `title` attribute, which we mirror into
  // `_title` via attributeChangedCallback. (Redefining it would conflict with
  // the inherited `string` typing.)

  get description(): string | null {
    return this._description;
  }
  set description(value: string | null) {
    const next = value ?? null;
    if (this._description === next) return;
    this._description = next;
    this.reflectString('description', next);
    this.requestUpdate();
  }

  get time(): string | null {
    return this._time;
  }
  set time(value: string | null) {
    const next = value ?? null;
    if (this._time === next) return;
    this._time = next;
    this.reflectString('time', next);
    this.requestUpdate();
  }

  get icon(): string | null {
    return this._icon;
  }
  set icon(value: string | null) {
    const next = value ?? null;
    if (this._icon === next) return;
    this._icon = next;
    this.reflectString('icon', next);
    this.requestUpdate();
  }

  get color(): string | null {
    return this._color;
  }
  set color(value: string | null) {
    const next = value ?? null;
    if (this._color === next) return;
    this._color = next;
    this.reflectString('color', next);
    this.requestUpdate();
  }

  get itemClass(): string | null {
    return this._itemClass;
  }
  set itemClass(value: string | null) {
    const next = value ?? null;
    if (this._itemClass === next) return;
    this._itemClass = next;
    this.reflectString('item-class', next);
    this.requestUpdate();
  }

  get disabled(): boolean {
    return this._disabled;
  }
  set disabled(value: boolean) {
    const next = !!value;
    if (this._disabled === next) return;
    this._disabled = next;
    this.reflectBoolean('disabled', next);
  }

  get selected(): boolean {
    return this._selected;
  }
  set selected(value: boolean) {
    const next = !!value;
    if (this._selected === next) return;
    this._selected = next;
    this.reflectBoolean('selected', next);
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
    switch (name) {
      case 'item-id':
        // Preserve a numeric itemId set via the property: our own setter
        // reflects it to the string attribute, which echoes back here. Only
        // adopt the raw string when it doesn't round-trip to the current value
        // (i.e. it was set externally via setAttribute), so a number we own is
        // never silently stringified — and string ids like "007" are kept
        // verbatim rather than coerced to a number.
        if (this._itemId === null || String(this._itemId) !== newValue) {
          this._itemId = newValue;
        }
        break;
      case 'title':
        this._title = newValue;
        break;
      case 'description':
        this._description = newValue;
        break;
      case 'time':
        this._time = newValue;
        break;
      case 'icon':
        this._icon = newValue;
        break;
      case 'color':
        this._color = newValue;
        break;
      case 'item-class':
        this._itemClass = newValue;
        break;
      case 'disabled':
        this._disabled = newValue !== null;
        break;
      case 'selected':
        this._selected = newValue !== null;
        break;
    }
    this.requestUpdate();
  }

  /** Mirror the per-item accent colour onto a CSS custom property. */
  protected override updated(): void {
    if (this._color) this.style.setProperty('--mp-tl-item-color', this._color);
    else this.style.removeProperty('--mp-tl-item-color');
  }

  private reflectString(name: string, value: string | null): void {
    if (value === null) {
      if (this.hasAttribute(name)) this.removeAttribute(name);
    } else if (this.getAttribute(name) !== value) {
      this.setAttribute(name, value);
    }
  }

  private reflectBoolean(name: string, value: boolean): void {
    if (value) {
      if (!this.hasAttribute(name)) this.setAttribute(name, '');
    } else if (this.hasAttribute(name)) {
      this.removeAttribute(name);
    }
  }

  override render(): TemplateResult {
    return html`
      <div class="item ${this._itemClass ?? ''}">
        <div class="opposite">
          <slot name="opposite"><slot name="timestamp">${this._time ?? nothing}</slot></slot>
        </div>
        <div class="line">
          <span class="marker">
            <slot name="marker">
              <span class="marker-dot">
                ${this._icon ? html`<i class=${this._icon} aria-hidden="true"></i>` : nothing}
              </span>
            </slot>
          </span>
          <span class="connector"><slot name="connector"></slot></span>
        </div>
        <div class="content">
          <div class="title"><slot name="title">${this._title ?? nothing}</slot></div>
          <div class="body">
            <!-- Only the named content slot - no default slot. A default slot
                 would let stray whitespace in the consumer's light DOM claim it
                 (and suppress any nested fallback), leaving slotted content with
                 no rendered box. The description attribute is the fallback. -->
            <slot name="content">${this._description ?? nothing}</slot>
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
