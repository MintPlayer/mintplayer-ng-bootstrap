import { Directive, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { BsCheckboxGroupDirective } from '../checkbox-group/checkbox-group.directive';

@Directive({
  selector: '[bsCheckboxGroup]',
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => BsCheckboxGroupValueAccessorDirective),
    multi: true,
  }],
})
export class BsCheckboxGroupValueAccessorDirective implements ControlValueAccessor {
  constructor(private group: BsCheckboxGroupDirective,) {}

  registerOnChange(fn: any) {
  }

  registerOnTouched(fn: any) {
  }

  setDisabledState(isDisabled: boolean) {
  }

  writeValue(obj: any) {
  }
}
