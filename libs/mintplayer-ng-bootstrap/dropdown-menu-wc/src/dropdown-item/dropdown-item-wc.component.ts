import { afterRenderEffect, ChangeDetectionStrategy, Component, computed, CUSTOM_ELEMENTS_SCHEMA, ElementRef, input, viewChild } from '@angular/core';
import type { MpDropdownItem } from '@mintplayer/web-components/dropdown-menu';

/**
 * `<bs-dropdown-wc-item>` — Angular wrapper around `<mp-dropdown-item>`.
 *
 * `selected` / `disabled` bridge to presence attributes. `value` is opaque
 * (any JS value), so it is assigned to the element **property** via the view
 * child rather than an attribute — the WC reads the property and carries it in
 * the menu's `select` event detail.
 *
 * Distinct selector from the legacy `bs-dropdown-item`
 * (`@mintplayer/ng-bootstrap/dropdown-menu`) to avoid a collision.
 */
@Component({
  selector: 'bs-dropdown-wc-item',
  templateUrl: './dropdown-item-wc.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class BsDropdownItemWc {
  readonly selected = input(false);
  readonly disabled = input(false);
  /** Opaque value carried in the menu's `select` event detail. */
  readonly value = input<unknown>();

  private readonly itemRef = viewChild.required<ElementRef<MpDropdownItem>>('wc');

  /** Presence attributes: `''` when set, `null` when absent. */
  protected readonly selectedAttr = computed(() => (this.selected() ? '' : null));
  protected readonly disabledAttr = computed(() => (this.disabled() ? '' : null));

  constructor() {
    // Assign the opaque `value` as an element property (attributes only carry
    // strings); re-runs whenever the input or the element ref changes.
    afterRenderEffect(() => {
      this.itemRef().nativeElement.value = this.value();
    });
  }
}
