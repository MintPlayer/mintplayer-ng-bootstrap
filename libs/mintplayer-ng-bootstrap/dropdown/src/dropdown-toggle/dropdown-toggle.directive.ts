import { Directive, ElementRef, HostListener } from '@angular/core';
import { take } from 'rxjs';
import { BsDropdownDirective } from '../dropdown/dropdown.directive';

@Directive({
  selector: '[bsDropdownToggle]'
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
    this.dropdown.isOpen$.pipe(take(1)).subscribe((isOpen) => {
      this.dropdown.isOpen$.next(!isOpen);
    });
  }
}
