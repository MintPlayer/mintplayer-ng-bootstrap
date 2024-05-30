import { Directive } from '@angular/core';
import { ControlValueAccessor } from '@angular/forms';

@Directive({
  selector: '[bsCheckGroup],[bsRadioGroup]',
  standalone: true,
  exportAs: 'bsCheckGroup,bsRadioGroup'
})
export class BsCheckRadioGroupDirective implements ControlValueAccessor {
  constructor() {}

  private onChange?: (value: boolean) => void;
  private onTouched?: () => void;

  writeValue(value: any) {
    
  }

  registerOnChange(fn: (value: boolean) => void) {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void) {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean) {
    
  }
}
