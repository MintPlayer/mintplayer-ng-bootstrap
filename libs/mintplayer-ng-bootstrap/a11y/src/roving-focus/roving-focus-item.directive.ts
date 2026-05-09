import { afterNextRender, computed, Directive, ElementRef, forwardRef, inject, input } from '@angular/core';
import { BsIdService } from '../service/id.service';
import { BsRovingFocusDirective } from './roving-focus.directive';

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

  /** The host element's id. Honoured if set externally (e.g. by a sibling directive's [attr.id] host binding); otherwise generated lazily after first render so combobox-style aria-activedescendant has a stable target. */
  get itemId(): string {
    return this.elementRef.nativeElement.id;
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
    // so the parent's activeDescendantId() has a stable target.
    afterNextRender(() => {
      if (!this.elementRef.nativeElement.id) {
        this.elementRef.nativeElement.id = this.ids.next('bs-rovingitem');
      }
    });
  }

  onFocus(): void {
    this.parent.setActiveItem(this);
  }
}
