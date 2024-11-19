import { Directive, HostBinding, HostListener, Input } from '@angular/core';

@Directive({
  selector: 'label[bsFor]',
})
export class BsForDirective {

  @HostBinding('class.cursor-default') defaultCursor = true;

  static counter = 1;
  private target: any;
  @Input() public set bsFor(value: any) {
    this.target = value;
    if (this.target instanceof HTMLElement) {
      if (!this.target.id) {
        const count = BsForDirective.counter++;
        this.target.id = `for-target-${count}`;
      }
      this.forValue = this.target.id;
    }
    // console.log('target', this.target);
  }

  @HostBinding('attr.for') forValue?: string;
  
  // @HostListener('click') onMouseClick() {
  //   if (!('tagName' in this.target)) {
  //     // Not a form-control, let's just assume the class has some "focus" method
  //     this.target.focus();
  //   } else if (this.target.tagName.toLowerCase() !== 'input') {
  //     // HTML element, but not an input, probably a textarea
  //     this.target.focus();
  //   } else if (this.target.type.toLowerCase() === 'file') {
  //     // HtmlInputElement for a file
  //     this.target.click();
  //   } else {
  //     // HtmlInputElement
  //     this.target.focus();
  //   }
  // }

}
