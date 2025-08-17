import { Directive, ElementRef, inject } from '@angular/core';

@Directive({
  selector: '[bsScrollspy]',
  standalone: false,
})
export class BsScrollspyDirective {
  element = inject(ElementRef);
}
