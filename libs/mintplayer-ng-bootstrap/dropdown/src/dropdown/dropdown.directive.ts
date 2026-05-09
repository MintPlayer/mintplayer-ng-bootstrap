import { contentChild, Directive, ElementRef, inject, input, model } from '@angular/core';
import { BS_DEVELOPMENT } from '@mintplayer/ng-bootstrap';
import { BsIdService } from '@mintplayer/ng-bootstrap/a11y';
import { BsDropdownMenuDirective } from '../dropdown-menu/dropdown-menu.directive';
import { BsDropdownToggleDirective } from '../dropdown-toggle/dropdown-toggle.directive';

export type BsDropdownPopupRole = 'menu' | 'listbox';

@Directive({
  selector: '[bsDropdown]',
  exportAs: 'bsDropdown',
  host: {
    '(window:blur)': 'onBlur()',
  },
})
export class BsDropdownDirective {

  elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private bsDevelopment = inject(BS_DEVELOPMENT, { optional: true });
  private ids = inject(BsIdService);

  readonly menu = contentChild.required(BsDropdownMenuDirective);
  readonly toggle = contentChild(BsDropdownToggleDirective);

  hasBackdrop = input(false);
  sameWidth = input(false);
  closeOnClickOutside = input(true);
  sameDropdownWidth = input(false);
  isOpen = model<boolean>(false);
  readonly popupRole = input<BsDropdownPopupRole>('menu');

  readonly menuId = this.elementRef.nativeElement.id
    ? `${this.elementRef.nativeElement.id}-menu`
    : this.ids.next('bs-dropdown-menu');

  onBlur() {
    if (this.closeOnClickOutside() && !this.bsDevelopment) {
      this.isOpen.set(false);
    }
  }
}
