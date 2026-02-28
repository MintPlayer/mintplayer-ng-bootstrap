import { Directive, ElementRef } from '@angular/core';
import { BsDropdownDirective } from '../dropdown/dropdown.directive';

@Directive({
  selector: '[bsDropdownToggle]',
  standalone: false,
  host: {
    '[attr.aria-haspopup]': '"true"',
    '[attr.aria-expanded]': 'dropdown.isOpen()',
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
