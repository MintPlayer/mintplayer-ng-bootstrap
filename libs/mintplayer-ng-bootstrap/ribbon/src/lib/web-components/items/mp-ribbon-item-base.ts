import { LitElement } from 'lit';
import { property } from 'lit/decorators.js';

export type RibbonItemSize = 'large' | 'medium' | 'small';

/**
 * Base class for all ribbon item kinds.
 * Provides common properties: id, label, icon, size, disabled, tooltip.
 */
export class MpRibbonItemBase extends LitElement {
  /** Unique identifier for this item */
  @property({ type: String, attribute: 'item-id' })
  itemId: string = '';

  /** Display label */
  @property({ type: String })
  label: string = '';

  /** Icon class or image URL */
  @property({ type: String })
  icon: string = '';

  /** Size: large (tall), medium (normal), small (compact) */
  @property({ type: String })
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
}
