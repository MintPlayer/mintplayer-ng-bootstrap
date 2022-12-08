import { Directive, ElementRef } from '@angular/core';

@Directive({
  selector: '[bsScrollspy]'
})
export class BsScrollspyDirective {

  constructor(element: ElementRef) {
    this.element = element;
  }

  element: ElementRef;

}
