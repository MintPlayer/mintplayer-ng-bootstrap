import { Directive, ElementRef, HostListener } from '@angular/core';
import { BsDropdownDirective } from '../dropdown/dropdown.directive';
// import { BsDropdownComponent } from '../dropdown/dropdown.component';

@Directive({
  selector: '[bsDropdownToggle]',
  standalone: false,
})
export class BsDropdownToggleDirective {

  constructor(
    private dropdown: BsDropdownDirective,
    // private dropdown: BsDropdownComponent,
    toggleButton: ElementRef) {
      this.toggleButton = toggleButton;
    }

  toggleButton: ElementRef;


  @HostListener('click')
  onClick() {
    this.dropdown.isOpen.set(!this.dropdown.isOpen());
  }
}
