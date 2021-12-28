import { Directive, ElementRef, HostBinding, Renderer2 } from '@angular/core';
import { BsDropdownDirective } from '../dropdown/dropdown.directive';

@Directive({
  selector: '[bsDropdownMenu]'
})
export class BsDropdownMenuDirective {

  constructor(dropdown: BsDropdownDirective, elementRef: ElementRef<HTMLElement>) {
    this.dropdown = dropdown;
    this.nativeElement = elementRef.nativeElement;
  }

  dropdown: BsDropdownDirective;
  nativeElement: HTMLElement;
}
