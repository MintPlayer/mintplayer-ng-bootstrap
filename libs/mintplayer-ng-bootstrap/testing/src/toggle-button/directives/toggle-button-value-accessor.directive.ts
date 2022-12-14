import { Directive, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Directive({
  selector: 'bs-toggle-button',
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => BsToggleButtonMockValueAccessor),
    multi: true,
  }],
})
export class BsToggleButtonMockValueAccessor implements ControlValueAccessor {
  onValueChange?: (value: boolean | string | string[]) => void;
  onTouched?: () => void;

  registerOnChange(fn: (_: any) => void) {
    this.onValueChange = fn;
  }
  
  registerOnTouched(fn: () => void) {
    this.onTouched = fn;
  }

  writeValue(value: boolean | string | string[]) {
  }

  setDisabledState(isDisabled: boolean) {
  }
}
