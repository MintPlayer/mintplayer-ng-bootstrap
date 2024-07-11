import { AfterViewInit, Directive, forwardRef } from '@angular/core';
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
export class BsCheckboxGroupValueAccessorDirective implements ControlValueAccessor, AfterViewInit {
  constructor(private group: BsCheckboxGroupDirective) {}

  onValueChange?: (value: number) => void;
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
    this.group.checks().forEach(check => check.isEnabled.set(!isDisabled))
  }

  writeValue(obj: any) {
  }
}
