import { AfterViewInit, Directive, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { BsRadioGroupDirective } from '../radio-group/radio-group.directive';

@Directive({
  selector: '[bsRadioGroup]',
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => BsRadioGroupValueAccessorDirective),
    multi: true
  }]
})
export class BsRadioGroupValueAccessorDirective implements ControlValueAccessor, AfterViewInit {
  constructor(private group: BsRadioGroupDirective) {}

  onValueChange?: (value: boolean | string | string[]) => void;
  onTouched?: () => void;

  ngAfterViewInit() {
    
  }

  registerOnChange(fn: any) {
    this.onValueChange = fn;
  }

  registerOnTouched(fn: any) {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean) {
    console.warn('disabled', isDisabled);
    this.group.radios().forEach(radio => radio.isEnabled.set(!isDisabled))
  }

  writeValue(obj: any) {
  }
}
