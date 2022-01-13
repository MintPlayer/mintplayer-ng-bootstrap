import { Directive, HostBinding, HostListener, Input } from '@angular/core';

@Directive({
  selector: '[bsFor]'
})
export class BsForDirective {

  @HostBinding('class.cursor-default') defaultCursor = true;

  @Input() bsFor: any;
  @HostListener('click') onMouseClick() {
    if (!('tagName' in this.bsFor)) {
      this.bsFor.focus();
    } else if (this.bsFor.tagName.toLowerCase() !== 'input') {
      this.bsFor.focus();
    } else if (this.bsFor.type.toLowerCase() === 'file') {
      this.bsFor.click();
    } else {
      this.bsFor.focus();
    }
  }

}
