/** How the menu exposes itself to assistive tech (and how items are roled). */
export type DropdownMode = 'menu' | 'listbox';

/** `detail` of the `select` event the menu dispatches when an item is activated. */
export interface DropdownSelectEventDetail {
  /** The activated `.dropdown-item` element. */
  item: HTMLElement;
  /** The item's opaque value (a `value` JS property or `data-value` attribute), if set. */
  value?: unknown;
}
