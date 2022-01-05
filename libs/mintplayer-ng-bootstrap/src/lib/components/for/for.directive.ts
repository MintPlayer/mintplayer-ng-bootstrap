import { Directive, HostListener, Input } from '@angular/core';

@Directive({
  selector: '[bsFor]'
})
export class BsForDirective {

  @Input() bsFor: any;
  @HostListener('click') onMouseClick() {
    this.bsFor.focus();
  }

}
