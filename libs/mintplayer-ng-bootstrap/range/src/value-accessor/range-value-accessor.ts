import { AfterViewInit, DestroyRef, Directive, forwardRef, inject } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent } from 'rxjs';
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
  host = inject(BsRangeComponent);
  destroy = inject(DestroyRef);

  onValueChange?: (value: number) => void;
  onTouched?: () => void;

  ngAfterViewInit() {
    fromEvent(this.host.slider.nativeElement, 'input')
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe((ev) => {
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
