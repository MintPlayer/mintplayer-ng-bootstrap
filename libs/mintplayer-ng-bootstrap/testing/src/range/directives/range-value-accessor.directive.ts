import { Directive, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Directive({
  selector: 'bs-range',
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => BsRangeMockValueAccessor),
    multi: true,
  }],
})
export class BsRangeMockValueAccessor implements ControlValueAccessor {
  onValueChange?: (value: number) => void;
  onTouched?: () => void;

  registerOnChange(fn: (_: any) => void) {
    this.onValueChange = fn;
  }
  
  registerOnTouched(fn: () => void) {
    this.onTouched = fn;
  }

  writeValue(value: number) {
  }

  setDisabledState(isDisabled: boolean) {
  }
}
