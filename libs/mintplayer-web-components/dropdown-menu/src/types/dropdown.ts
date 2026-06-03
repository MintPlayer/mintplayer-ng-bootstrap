/** How the menu exposes itself to assistive tech (and how items are roled). */
export type DropdownMode = 'menu' | 'listbox';

/** `detail` of the `select` event the menu dispatches when an item is activated. */
export interface DropdownSelectEventDetail {
  /** The activated `<mp-dropdown-item>`. */
  item: HTMLElement;
  /** The item's `value` property (opaque), if set. */
  value?: unknown;
}
