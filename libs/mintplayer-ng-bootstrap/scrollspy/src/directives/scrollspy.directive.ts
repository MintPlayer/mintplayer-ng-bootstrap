import { Directive, ElementRef, inject } from '@angular/core';

@Directive({
  selector: '[bsScrollspy]',
})
export class BsScrollspyDirective {
  element = inject(ElementRef);
}
