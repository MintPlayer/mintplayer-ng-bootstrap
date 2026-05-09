import { computed, Directive, ElementRef, forwardRef, inject, input } from '@angular/core';
import { BsIdService } from '../service/id.service';
import { BsRovingFocusDirective } from './roving-focus.directive';

@Directive({
  selector: '[bsRovingFocusItem]',
  exportAs: 'bsRovingFocusItem',
  host: {
    '[attr.tabindex]': 'tabindex()',
    '[attr.id]': 'itemId',
    '[class.bs-rovingfocus-active]': 'isActive()',
    '(focus)': 'onFocus()',
  },
})
export class BsRovingFocusItemDirective {
  private parent = inject(forwardRef(() => BsRovingFocusDirective));
  elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private ids = inject(BsIdService);

  readonly disabled = input(false);

  readonly itemId = this.elementRef.nativeElement.id || this.ids.next('bs-rovingitem');

  readonly index = computed(() => this.parent.items().indexOf(this));
  readonly isActive = computed(() => this.index() === this.parent.activeIndex());

  readonly tabindex = computed(() => {
    if (this.parent.mode() === 'activedescendant') return -1;
    return this.isActive() ? 0 : -1;
  });

  onFocus(): void {
    this.parent.setActiveItem(this);
  }
}
