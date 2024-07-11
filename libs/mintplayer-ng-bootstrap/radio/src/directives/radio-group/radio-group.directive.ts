import { contentChildren, Directive, forwardRef, input } from '@angular/core';
import { BsRadioComponent } from '../../component/radio.component';

@Directive({
  selector: '[bsRadioGroup]',
})
export class BsRadioGroupDirective {
  name = input.required<string>();
  radios = contentChildren<BsRadioComponent>(forwardRef(() => BsRadioComponent));
}
