import { css, LitElement } from 'lit';
import { property } from 'lit/decorators.js';

export type RibbonItemSize = 'large' | 'medium' | 'small';

/**
 * FR-16: shared CSS for slot-based icon projection. Every ribbon item
 * adds this to its `static styles` so:
 *
 * - Slotted `<i slot="icon">` (or anything else with `slot="icon"`) is
 *   auto-sized based on the item host's current `size` attribute. Slotted
 *   elements live in light DOM and don't inherit shadow-tree styles, so
 *   explicit `::slotted` rules are required.
 * - Consumers can opt into explicit sizing via `.ribbon-icon-large /
 *   -medium / -small` utility classes — applied to the slotted icon
 *   element, they win via `!important` regardless of the host size.
 *
 * Items that don't extend MpRibbonItemBase (template-item, menu-item,
 * gallery-item) compose this constant the same way.
 */
export const RIBBON_ICON_SLOT_STYLES = css`
  :host([size="large"]) ::slotted([slot="icon"]) {
    font-size: 28px;
    width: 28px;
    height: 28px;
    line-height: 1;
  }
  :host([size="medium"]) ::slotted([slot="icon"]) {
    font-size: 16px;
    width: 16px;
    height: 16px;
    line-height: 1;
  }
  :host([size="small"]) ::slotted([slot="icon"]) {
    font-size: 14px;
    width: 14px;
    height: 14px;
    line-height: 1;
  }
  ::slotted(.ribbon-icon-large) {
    font-size: 28px !important;
    width: 28px !important;
    height: 28px !important;
    line-height: 1 !important;
  }
  ::slotted(.ribbon-icon-medium) {
    font-size: 16px !important;
    width: 16px !important;
    height: 16px !important;
    line-height: 1 !important;
  }
  ::slotted(.ribbon-icon-small) {
    font-size: 14px !important;
    width: 14px !important;
    height: 14px !important;
    line-height: 1 !important;
  }
`;

/**
 * Base class for all ribbon item kinds.
 * Provides common properties: id, label, icon, size, disabled, tooltip.
 *
 * `delegatesFocus: true` lets the host stand in for its inner button in
 * sequential tab order — setting `tabindex` on the host then controls
 * whether the whole item is reachable via Tab, which is what the
 * roving-tabindex implementation in `mp-ribbon-group` relies on. Without
 * delegatesFocus, the browser would walk into each item's shadow root
 * regardless of host tabindex, breaking the APG toolbar pattern.
 */
export class MpRibbonItemBase extends LitElement {
  static override shadowRootOptions: ShadowRootInit = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  /** Unique identifier for this item */
  @property({ type: String, attribute: 'item-id' })
  itemId: string = '';

  /** Display label */
  @property({ type: String })
  label: string = '';

  /** Icon class or image URL */
  @property({ type: String })
  icon: string = '';

  /**
   * Size: large (tall), medium (normal), small (compact).
   *
   * - Reflected to the `size` attribute on the host (existing API; consumer
   *   templates set `size="large"` etc.).
   * - Mirrored to `data-size` via `updated()` so consumer light-DOM CSS can
   *   target item sizes via `bs-ribbon-button[data-size="large"]` without
   *   reaching into shadow DOM (FR-5).
   * - The inner element gets a `ribbon-item-<size>` class for the
   *   component's own shadow-DOM styles.
   */
  @property({ type: String, reflect: true })
  size: RibbonItemSize = 'medium';

  /** Disabled state */
  @property({ type: Boolean })
  disabled: boolean = false;

  /** Tooltip / title text */
  @property({ type: String })
  tooltip: string = '';

  constructor() {
    super();
    this.addEventListener('click', (e) => this.onClick(e));
  }

  protected onClick(_event: MouseEvent): void {
    if (this.disabled) return;
    this.dispatchEvent(
      new CustomEvent('item-click', {
        detail: { itemId: this.itemId },
        bubbles: true,
        composed: true,
      })
    );
  }

  protected getSizeClass(): string {
    return `ribbon-item-${this.size}`;
  }

  protected getDisabledAttr(): string | null {
    return this.disabled ? 'disabled' : null;
  }

  /** Mirror `size` → `data-size` for FR-5 consumer-CSS hooks. */
  protected override updated(changed: Map<string, unknown>): void {
    super.updated(changed);
    if (changed.has('size')) {
      this.setAttribute('data-size', this.size);
    }
  }
}
