import { Directive, ElementRef, HostBinding, HostListener } from '@angular/core';
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

  @HostBinding('attr.aria-haspopup') ariaHasPopup = 'true';
  @HostBinding('attr.aria-expanded') get ariaExpanded() {
    return this.dropdown.isOpen();
  }

  @HostListener('click')
  onClick() {
    this.dropdown.isOpen.set(!this.dropdown.isOpen());
  }
}
