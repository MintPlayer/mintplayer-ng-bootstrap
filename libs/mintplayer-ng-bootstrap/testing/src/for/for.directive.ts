import { Directive, Input } from '@angular/core';

@Directive({
  selector: '[bsFor]'
})
export class BsForMockDirective {
  @Input() bsFor!: any;
}
