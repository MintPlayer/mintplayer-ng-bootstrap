import { Directive, ElementRef, effect, inject, input } from '@angular/core';
import type { DropdownItemElement } from '@mintplayer/ui-core/dropdown-menu';

/**
 * `[bsDropdownItem]` — marks a plain `<li>` as a Bootstrap `.dropdown-item`
 * inside a `<bs-dropdown-menu>`. Bootstrap styles the box; a nested `<a>` /
 * `<button>` (e.g. a `routerLink`) fills it through the menu's scoped sheet.
 *
 * Usage: `<li bsDropdownItem><a routerLink="/x">Action</a></li>`.
 *
 * Inputs:
 *  - `active`   — Bootstrap `.active` appearance.
 *  - `disabled` — non-interactive; removed from the menu's roving order.
 *  - `value`    — opaque value carried in the menu's `select` event detail;
 *    written to the host `<li>` as its `dropdownValue` property, which the menu
 *    reads. Not the `value` property: `HTMLLIElement.value` is a native long
 *    that turns an object or a string into 0.
 */
@Directive({
  selector: '[bsDropdownItem]',
  host: {
    '[class.dropdown-item]': 'true',
    '[class.active]': 'active()',
    '[class.disabled]': 'disabled()',
    '[attr.aria-disabled]': "disabled() ? 'true' : null",
  },
})
export class BsDropdownItemDirective {
  readonly active = input(false);
  readonly disabled = input(false);
  /** Opaque value carried in the menu's `select` event detail. */
  readonly value = input<unknown>();

  constructor() {
    const el = inject<ElementRef<DropdownItemElement>>(ElementRef);
    effect(() => {
      el.nativeElement.dropdownValue = this.value();
    });
  }
}
