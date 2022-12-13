import { Directive, ElementRef } from '@angular/core';
import { BsScrollspyDirective } from '@mintplayer/ng-bootstrap/scrollspy';

@Directive({
  selector: '[bsScrollspy]',
  providers: [
    { provide: BsScrollspyDirective, useExisting: BsScrollspyMockDirective },
  ]
})
export class BsScrollspyMockDirective {
  constructor(element: ElementRef) {
    this.element = element;
  }

  element: ElementRef;
}
