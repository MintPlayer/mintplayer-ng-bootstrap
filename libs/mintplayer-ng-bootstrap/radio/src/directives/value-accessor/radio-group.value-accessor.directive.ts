import { Directive } from '@angular/core';
import { ControlValueAccessor } from '@angular/forms';

@Directive({
  selector: '[bsRadioGroupValueAccessor]',
  standalone: true,
})
export class BsRadioGroupValueAccessorDirective implements ControlValueAccessor {
  constructor() {}

  registerOnChange(fn: any) {
  }

  registerOnTouched(fn: any) {
  }

  setDisabledState(isDisabled: boolean) {
  }

  writeValue(obj: any) {
  }
}
