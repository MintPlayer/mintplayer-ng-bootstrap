import { AfterViewInit, Directive, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { BsToggleButtonComponent } from '../component/toggle-button.component';

@Directive({
  selector: 'bs-toggle-button',
  standalone: false,
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => BsToggleButtonValueAccessor),
    multi: true,
  }],
})
export class BsToggleButtonValueAccessor implements ControlValueAccessor, AfterViewInit {
  constructor(private host: BsToggleButtonComponent) {}

  onValueChange?: (value: boolean | string | string[]) => void;
  onTouched?: () => void;

  ngAfterViewInit() {
    this.host.checkbox.nativeElement.addEventListener('change', (ev: Event) => {
      if (this.onValueChange && this.host.checkbox) {
        const isChecked = (<HTMLInputElement>ev.target).checked;
        switch (this.host.typeSignal()) {
          case 'radio':
          case 'radio_toggle_button':
            if (isChecked) {
              this.onValueChange(this.host.checkbox.nativeElement.value);
            }
            break;
          default:
            if (this.host.groupSignal()) {
              const group = this.host.groupSignal();
              const itemValue = this.host.checkbox.nativeElement.value;

              const result = group!.toggleButtons
                .map(tb => ({ value: tb.valueSignal(), checked: tb.checkbox.nativeElement.checked }))
                .filter(tb => !!tb.value && tb.checked)
                .map(tb => <string>tb.value);

              if (this.host.checkbox.nativeElement.checked) {
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
    });
  }

  //#region ControlValueAccessor implementation
  registerOnChange(fn: (_: any) => void) {
    this.onValueChange = fn;
  }

  registerOnTouched(fn: () => void) {
    this.onTouched = fn;
  }

  writeValue(value: boolean | string | string[]) {
    if (this.host.checkbox) {
      switch (this.host.typeSignal()) {
        case 'radio':
        case 'radio_toggle_button':
          if (<string>value === this.host.valueSignal()) {
            this.host.checkbox.nativeElement.checked = true;
          }
          break;
        default:
          if (this.host.groupSignal()) {
            this.host.checkbox.nativeElement.checked = (<string[]>value).includes(this.host.valueSignal()!);
          } else {
            this.host.checkbox.nativeElement.checked = <boolean>value;
          }
          break;
      }
    }
  }

  setDisabledState(isDisabled: boolean) {
    if (this.host.checkbox) {
      this.host.checkbox.nativeElement.disabled = isDisabled;
    }
  }
  //#endregion

}
