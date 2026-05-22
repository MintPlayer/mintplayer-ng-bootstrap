import { afterNextRender, computed, Directive, ElementRef, forwardRef, inject, input, signal } from '@angular/core';
import { BsIdService } from '../service/id.service';
import { BsRovingFocusDirective } from './roving-focus.directive';

/**
 * One marker per focusable child of a `bsRovingFocus` container.
 *
 * - Mirrors the parent's mode into the host `tabindex` (0 if active in
 *   `tabindex` mode, -1 otherwise).
 * - Toggles the `.bs-rovingfocus-active` class so SCSS can paint a focused-
 *   look highlight on the active item — important in `activedescendant`
 *   mode, where the item never receives `:focus` and the browser's focus
 *   ring never paints.
 * - Auto-generates an `id` if the host doesn't already have one, so combobox
 *   `aria-activedescendant` always has a stable target. Honours an
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
   * so combobox-style aria-activedescendant has a stable target.
   *
   * Backed by a signal so parent computeds (like BsRovingFocusDirective's
   * activeDescendantId) re-run when the id is resolved post-mount. A plain
   * `nativeElement.id` getter would be silently cached during the first
   * computation and never re-read — leading to aria-activedescendant="" on
   * combobox inputs even after the items got real ids.
   */
  private readonly _itemId = signal<string>('');
  get itemId(): string {
    return this._itemId();
  }

  readonly index = computed(() => this.parent.items().indexOf(this));
  readonly isActive = computed(() => this.index() === this.parent.activeIndex());

  readonly tabindex = computed(() => {
    if (this.parent.mode() === 'activedescendant') return -1;
    return this.isActive() ? 0 : -1;
  });

  constructor() {
    // After the first render, all sibling host bindings on this element have applied.
    // If no other directive (e.g. BsDropdownItemComponent) supplied an id, generate one
    // so the parent's activeDescendantId() has a stable target. Then publish the
    // resolved id to the signal so reactive consumers see it.
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
