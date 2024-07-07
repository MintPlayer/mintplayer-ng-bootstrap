import { ContentChildren, Directive, Input, QueryList, forwardRef, input } from '@angular/core';
import { BsCheckboxComponent } from '../../component/checkbox.component';

@Directive({
  selector: '[bsCheckboxGroup]',
})
export class BsCheckboxGroupDirective {
  @Input({ required: true }) name!: string;
  // name = input.required<string>();

  // TODO: Use contentChildren function
  @ContentChildren(forwardRef(() => BsCheckboxComponent)) children!: QueryList<BsCheckboxComponent>;
}
