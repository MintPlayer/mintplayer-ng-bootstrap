import { AfterViewInit, Directive, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { BsRangeComponent } from '../component/range.component';

@Directive({
  selector: 'bs-range',
  standalone: false,
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => BsRangeValueAccessor),
    multi: true,
  }],
})
export class BsRangeValueAccessor implements ControlValueAccessor, AfterViewInit {
  constructor(private host: BsRangeComponent) {}

  onValueChange?: (value: number) => void;
  onTouched?: () => void;

  ngAfterViewInit() {
    this.host.slider.nativeElement.addEventListener('input', (ev: Event) => {
      if (this.onValueChange) {
        const val = parseFloat((<HTMLInputElement>ev.target).value);
        this.onValueChange(val);
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

  writeValue(value?: number) {
    if (this.host.slider && (typeof value === 'number')) {
      this.host.slider.nativeElement.value = value.toString();
    }
  }

  setDisabledState(isDisabled: boolean) {
    if (this.host.slider) {
      this.host.slider.nativeElement.disabled = isDisabled;
    }
  }
  //#endregion

}
