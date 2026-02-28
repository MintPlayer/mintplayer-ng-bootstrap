import { contentChild, Directive, effect, ElementRef, inject, input, model, Optional } from '@angular/core';
import { BS_DEVELOPMENT } from '@mintplayer/ng-bootstrap';
import { BsDropdownMenuDirective } from '../dropdown-menu/dropdown-menu.directive';
import { BsDropdownToggleDirective } from '../dropdown-toggle/dropdown-toggle.directive';

@Directive({
  selector: '[bsDropdown]',
  host: {
    '(window:blur)': 'onBlur()',
  },
})
export class BsDropdownDirective {

  elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private bsDevelopment = inject(BS_DEVELOPMENT, { optional: true });

  readonly menu = contentChild.required(BsDropdownMenuDirective);
  readonly toggle = contentChild(BsDropdownToggleDirective);

  hasBackdrop = input(false);
  sameWidth = input(false);
  closeOnClickOutside = input(true);
  sameDropdownWidth = input(false);
  isOpen = model<boolean>(false);

  onBlur() {
    if (this.closeOnClickOutside() && !this.bsDevelopment) {
      this.isOpen.set(false);
    }
  }
}
