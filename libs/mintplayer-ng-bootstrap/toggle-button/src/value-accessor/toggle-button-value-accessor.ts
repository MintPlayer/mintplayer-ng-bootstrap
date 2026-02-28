import { Directive, forwardRef, inject } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { BsToggleButtonComponent } from '../component/toggle-button.component';

@Directive({
  selector: 'bs-toggle-button',
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => BsToggleButtonValueAccessor),
    multi: true,
  }],
  host: {
    '(change)': 'onChangeEvent($event)',
  },
})
export class BsToggleButtonValueAccessor implements ControlValueAccessor {
  private host = inject(BsToggleButtonComponent);

  onValueChange?: (value: boolean | string | string[]) => void;
  onTouched?: () => void;

  onChangeEvent(ev: Event) {
    if (this.onValueChange) {
      const isChecked = (<HTMLInputElement>ev.target).checked;
      switch (this.host.type()) {
        case 'radio':
        case 'radio_toggle_button':
          if (isChecked) {
            this.onValueChange(this.host.checkbox().nativeElement.value);
          }
          break;
        default:
          const group = this.host.group();
          if (group) {
            const itemValue = this.host.checkbox().nativeElement.value;

            const result = group.toggleButtons()
              .map(tb => ({ value: tb.value(), checked: tb.checkbox().nativeElement.checked }))
              .filter(tb => !!tb.value && tb.checked)
              .map(tb => <string>tb.value);

            if (this.host.checkbox().nativeElement.checked) {
              if (!result.includes(itemValue)) {
                result.push(itemValue);
              }
            } else {
              if (result.includes(itemValue)) {
                result.splice(result.indexOf(itemValue), 1);
              }
            }

            this.onValueChange(result);
          } else {
            this.onValueChange(isChecked);
          }
          break;
      }
    }
  }

  //#region ControlValueAccessor implementation
  registerOnChange(fn: (_: any) => void) {
    this.onValueChange = fn;
  }

  registerOnTouched(fn: () => void) {
    this.onTouched = fn;
  }

  writeValue(value: boolean | string | string[]) {
    const checkbox = this.host.checkbox();
    if (checkbox) {
      switch (this.host.type()) {
        case 'radio':
        case 'radio_toggle_button':
          if (<string>value === this.host.value()) {
            checkbox.nativeElement.checked = true;
          }
          break;
        default:
          if (this.host.group()) {
            checkbox.nativeElement.checked = Array.isArray(value) && value.includes(this.host.value()!);
          } else {
            checkbox.nativeElement.checked = <boolean>value;
          }
          break;
      }
    }
  }

  setDisabledState(isDisabled: boolean) {
    const checkbox = this.host.checkbox();
    if (checkbox) {
      checkbox.nativeElement.disabled = isDisabled;
    }
  }
  //#endregion

}
