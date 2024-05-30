import { Component, Input, Optional, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsCheckRadioGroupDirective, BsFormCheckComponent } from '@mintplayer/ng-bootstrap/form-check';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { BsRadioStyle } from '../radio-style';

@Component({
  selector: 'bs-radio-button',
  standalone: true,
  imports: [CommonModule, BsFormCheckComponent],
  templateUrl: './radio-button.component.html',
  styleUrl: './radio-button.component.scss',
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => BsRadioButtonComponent),
    multi: true
  }]
})
export class BsRadioButtonComponent implements ControlValueAccessor {
  
  constructor(@Optional() group?: BsCheckRadioGroupDirective) {}

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

  @Input() displayStyle: BsRadioStyle = 'radio';
  @Input() value?: string;

}
