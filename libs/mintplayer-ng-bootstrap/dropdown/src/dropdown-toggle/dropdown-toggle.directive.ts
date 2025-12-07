import { Directive, ElementRef, HostListener } from '@angular/core';
import { BsDropdownDirective } from '../dropdown/dropdown.directive';

@Directive({
  selector: '[bsDropdownToggle]',
  standalone: false,
})
export class BsDropdownToggleDirective {

  constructor(
    private dropdown: BsDropdownDirective,
    toggleButton: ElementRef) {
      this.toggleButton = toggleButton;
    }

  toggleButton: ElementRef;


  @HostListener('click')
  onClick() {
    this.dropdown.setIsOpen(!this.dropdown.isOpenSignal());
  }
}
