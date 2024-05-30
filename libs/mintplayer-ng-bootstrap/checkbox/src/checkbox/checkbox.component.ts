import { Component, Input, Optional, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { BsCheckRadioGroupDirective, BsFormCheckComponent } from '@mintplayer/ng-bootstrap/form-check';
import { BsCheckStyle } from '../check-style';

@Component({
  selector: 'bs-checkbox',
  standalone: true,
  imports: [CommonModule, BsFormCheckComponent],
  templateUrl: './checkbox.component.html',
  styleUrl: './checkbox.component.scss',
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => BsCheckboxComponent),
    multi: true
  }]
})
export class BsCheckboxComponent implements ControlValueAccessor {

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

  @Input() displayStyle: BsCheckStyle = 'checkbox';
  @Input() value?: string;

}
