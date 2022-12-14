import { Directive, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { BsSelectValueAccessor } from '@mintplayer/ng-bootstrap/select';

@Directive({
  selector: 'bs-select',
  providers: [{
    provide: BsSelectValueAccessor,
    useExisting: BsSelectMockValueAccessor
  }, {
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => BsSelectMockValueAccessor),
    multi: true,
  }]
})
export class BsSelectMockValueAccessor implements ControlValueAccessor {
  registerOnChange(fn: (_: any) => void) {}
  registerOnTouched(fn: () => void) {}
  writeValue(value: boolean | string | string[]) {}
  setDisabledState(isDisabled: boolean) {}
}
