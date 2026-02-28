import { Directive, ElementRef, inject } from '@angular/core';

@Directive({
  selector: '[bsScrollspy]',
  standalone: true,
})
export class BsScrollspyDirective {
  element = inject(ElementRef);
}
