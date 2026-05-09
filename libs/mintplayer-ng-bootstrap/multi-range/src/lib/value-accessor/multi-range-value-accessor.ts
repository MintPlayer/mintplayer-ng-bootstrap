import { Directive, forwardRef, inject } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { BsMultiRangeComponent } from '../components/multi-range.component';

@Directive({
  selector: 'bs-multi-range',
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => BsMultiRangeValueAccessor),
    multi: true,
  }],
  host: {
    '(value-input)': 'onInputEvent($event)',
    '(value-change)': 'onTouchEvent()',
  },
})
export class BsMultiRangeValueAccessor implements ControlValueAccessor {
  private host = inject(BsMultiRangeComponent);

  private onValueChange?: (value: number[]) => void;
  private onTouched?: () => void;

  protected onInputEvent(ev: Event) {
    if (!this.onValueChange) return;
    const detail = (ev as CustomEvent<number[]>).detail;
    if (detail) this.onValueChange([...detail]);
  }

  protected onTouchEvent() {
    if (this.onTouched) this.onTouched();
  }

  registerOnChange(fn: (value: number[]) => void) {
    this.onValueChange = fn;
  }

  registerOnTouched(fn: () => void) {
    this.onTouched = fn;
  }

  writeValue(value: number[] | null | undefined) {
    const ref = this.host.elementRef();
    if (!ref) return;
    ref.nativeElement.value = value ?? [];
  }

  setDisabledState(isDisabled: boolean) {
    const ref = this.host.elementRef();
    if (!ref) return;
    if (isDisabled) {
      ref.nativeElement.setAttribute('disabled', '');
    } else {
      ref.nativeElement.removeAttribute('disabled');
    }
  }
}
