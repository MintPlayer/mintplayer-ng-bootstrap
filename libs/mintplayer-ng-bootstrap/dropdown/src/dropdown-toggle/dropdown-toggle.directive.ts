import { Directive, ElementRef, HostListener, inject } from '@angular/core';
import { take } from 'rxjs';
import { BsDropdownDirective } from '../dropdown/dropdown.directive';
// import { BsDropdownComponent } from '../dropdown/dropdown.component';

@Directive({
  selector: '[bsDropdownToggle]',
  standalone: false,
})
export class BsDropdownToggleDirective {

  dropdown = inject(BsDropdownDirective);
  toggleButton = inject(ElementRef);

  @HostListener('click')
  onClick() {
    this.dropdown.isOpen = !this.dropdown.isOpen$.value;
  }
}
