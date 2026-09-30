/** How the menu exposes itself to assistive tech (and how items are roled). */
export type DropdownMode = 'menu' | 'listbox';

/**
 * A `.dropdown-item` carrying an opaque value for the menu's `select` event.
 * Assign any value (object, string, number) to `dropdownValue`; the menu reports
 * it unchanged. This is the channel the framework wrappers use. `value` cannot
 * serve on an `<li>`: `HTMLLIElement.value` is a native long, so an object or a
 * string assigned to it becomes 0.
 */
export type DropdownItemElement = HTMLElement & { dropdownValue?: unknown };

/** `detail` of the `select` event the menu dispatches when an item is activated. */
export interface DropdownSelectEventDetail {
  /** The activated `.dropdown-item` element. */
  item: HTMLElement;
  /**
   * The item's opaque value, if set: its `dropdownValue` property, else its
   * `data-value` attribute, else its own `value`.
   */
  value?: unknown;
}
