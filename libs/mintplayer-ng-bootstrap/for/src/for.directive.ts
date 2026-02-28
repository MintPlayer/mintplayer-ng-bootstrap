import { Directive, effect, input } from '@angular/core';

@Directive({
  selector: 'label[bsFor]',
  standalone: true,
  host: {
    '[class.cursor-default]': 'true',
    '[attr.for]': 'forValue',
  },
})
export class BsForDirective {

  static counter = 1;
  private target: any;
  readonly bsFor = input<any>(undefined);

  constructor() {
    effect(() => {
      const value = this.bsFor();
      if (value !== undefined) {
        this.target = value;
        if (this.target instanceof HTMLElement) {
          if (!this.target.id) {
            const count = BsForDirective.counter++;
            this.target.id = `for-target-${count}`;
          }
          this.forValue = this.target.id;
        }
      }
    });
  }

  forValue?: string;

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
