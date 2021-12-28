import { Directive, ElementRef, HostListener, OnDestroy, OnInit } from '@angular/core';

@Directive({
  selector: '[bsScrollspy]'
})
export class BsScrollspyDirective {

  constructor(element: ElementRef) {
    this.element = element;
  }

  element: ElementRef;

}
