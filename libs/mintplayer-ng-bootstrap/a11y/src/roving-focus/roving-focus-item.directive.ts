import { afterNextRender, computed, Directive, ElementRef, forwardRef, inject, input, signal } from '@angular/core';
import { BsIdService } from '../service/id.service';
import { BsRovingFocusDirective } from './roving-focus.directive';

/**
 * One marker per focusable child of a `bsRovingFocus` container.
 *
 * - Sets the host `tabindex` (0 if active, -1 otherwise).
 * - Toggles the `.bs-rovingfocus-active` class so SCSS can paint a highlight
 *   on the active item.
 * - Auto-generates an `id` if the host doesn't already have one, so other
 *   ARIA references always have a stable target. Honours an
 *   externally-supplied id when present.
 *
 * Consumers normally don't interact with this directive directly — they
 * just stamp it on each list/menu/option element inside `bsRovingFocus`.
 */
@Directive({
  selector: '[bsRovingFocusItem]',
  exportAs: 'bsRovingFocusItem',
  host: {
    '[attr.tabindex]': 'tabindex()',
    '[class.bs-rovingfocus-active]': 'isActive()',
    '(focus)': 'onFocus()',
  },
})
export class BsRovingFocusItemDirective {
  private parent = inject(forwardRef(() => BsRovingFocusDirective));
  elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private ids = inject(BsIdService);

  readonly disabled = input(false);

  /**
   * The host element's id. Honoured if set externally (e.g. by a sibling
   * component's [attr.id] host binding); otherwise generated in afterNextRender
   * so an ARIA reference to the item has a stable target.
   *
   * Backed by a signal so a consumer computed that reads it re-runs when the id
   * is resolved post-mount. A plain `nativeElement.id` getter would be silently
   * cached during the first computation and never re-read.
   */
  private readonly _itemId = signal<string>('');
  get itemId(): string {
    return this._itemId();
  }

  readonly index = computed(() => this.parent.items().indexOf(this));
  readonly isActive = computed(() => this.index() === this.parent.activeIndex());

  readonly tabindex = computed(() => (this.isActive() ? 0 : -1));

  constructor() {
    // After the first render, all sibling host bindings on this element have applied.
    // If no other directive (e.g. BsDropdownItemComponent) supplied an id, generate one.
    // Then publish the resolved id to the signal so reactive consumers see it.
    afterNextRender(() => {
      if (!this.elementRef.nativeElement.id) {
        this.elementRef.nativeElement.id = this.ids.next('bs-rovingitem');
      }
      this._itemId.set(this.elementRef.nativeElement.id);
    });
  }

  onFocus(): void {
    this.parent.setActiveItem(this);
  }
}
