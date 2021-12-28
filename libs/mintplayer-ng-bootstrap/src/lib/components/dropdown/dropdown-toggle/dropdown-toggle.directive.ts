import { Directive, HostListener, OnChanges, SimpleChanges } from '@angular/core';
import { BsDropdownDirective } from '../dropdown/dropdown.directive';

@Directive({
  selector: '[bsDropdownToggle]'
})
export class BsDropdownToggleDirective {

  constructor(private dropdown: BsDropdownDirective) {
  }

  @HostListener('click')
  onClick() {
    console.log('clicked');
    this.dropdown.isOpen = !this.dropdown.isOpen;
  }

}
