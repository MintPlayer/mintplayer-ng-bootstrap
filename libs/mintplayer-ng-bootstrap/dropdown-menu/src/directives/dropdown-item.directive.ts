import { Directive, ElementRef, effect, inject, input } from '@angular/core';

/**
 * `[bsDropdownItem]` — marks a plain `<li>` as a Bootstrap `.dropdown-item`
 * inside a `<bs-dropdown-menu>`. There is no per-item web component: the item is
 * light-DOM `<li>` slotted into `<mp-dropdown-menu>`, whose shadow styles the box
 * via `::slotted(.dropdown-item)`. A nested `<a>`/`<button>` (e.g. a `routerLink`)
 * is reset by the companion light-DOM stylesheet the menu wrapper ships.
 *
 * Usage: `<li bsDropdownItem><a routerLink="/x">Action</a></li>`.
 *
 * Inputs:
 *  - `active`   — Bootstrap `.active` appearance (also drives `aria-selected` in
 *    a `listbox` menu).
 *  - `disabled` — non-interactive; removed from the menu's roving order.
 *  - `value`    — opaque value carried in the menu's `select` event detail;
 *    assigned as a `value` property on the host `<li>` (the WC reads it).
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
    const el = inject<ElementRef<HTMLElement>>(ElementRef);
    effect(() => {
      (el.nativeElement as HTMLElement & { value?: unknown }).value = this.value();
    });
  }
}
