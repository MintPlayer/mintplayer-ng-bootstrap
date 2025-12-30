import { AfterViewInit, Directive, forwardRef, inject, OnDestroy } from '@angular/core';
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
export class BsRangeValueAccessor implements ControlValueAccessor, AfterViewInit, OnDestroy {
  private host = inject(BsRangeComponent);

  onValueChange?: (value: number) => void;
  onTouched?: () => void;

  private inputHandler = (ev: Event) => {
    if (this.onValueChange) {
      const val = parseFloat((<HTMLInputElement>ev.target).value);
      this.onValueChange(val);
    }
  };

  ngAfterViewInit() {
    this.host.slider.nativeElement.addEventListener('input', this.inputHandler);
  }

  ngOnDestroy() {
    this.host.slider?.nativeElement.removeEventListener('input', this.inputHandler);
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
