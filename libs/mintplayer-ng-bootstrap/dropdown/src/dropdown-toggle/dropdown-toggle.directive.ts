import { Directive, ElementRef } from '@angular/core';
import { BsDropdownDirective } from '../dropdown/dropdown.directive';
@Directive({
  selector: '[bsDropdownToggle]',
  host: {
    '[attr.aria-haspopup]': 'dropdown.popupRole()',
    '[attr.aria-expanded]': 'dropdown.isOpen()',
    '[attr.aria-controls]': 'dropdown.menuId() || null',
    '(click)': 'onClick()',
  },
})
export class BsDropdownToggleDirective {

  constructor(
    public dropdown: BsDropdownDirective,
    toggleButton: ElementRef) {
      this.toggleButton = toggleButton;
    }

  toggleButton: ElementRef;

  onClick() {
    this.dropdown.isOpen.set(!this.dropdown.isOpen());
  }
}
