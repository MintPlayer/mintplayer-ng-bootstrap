import { AfterViewInit, Directive, forwardRef, HostListener, OnDestroy } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { fromEvent, Subject, takeUntil } from 'rxjs';
import { BsRangeComponent } from '../component/range.component';

@Directive({
  selector: 'bs-range',
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => BsRangeValueAccessor),
    multi: true,
  }],
})
export class BsRangeValueAccessor implements ControlValueAccessor, AfterViewInit, OnDestroy {
  constructor(private host: BsRangeComponent) {}

  destroyed$ = new Subject();

  onValueChange?: (value: number) => void;
  onTouched?: () => void;

  //#region Lifecycle hooks
  ngAfterViewInit() {
    fromEvent(this.host.slider.nativeElement, 'input')
      .pipe(takeUntil(this.destroyed$))
      .subscribe((ev) => {
        if (this.onValueChange) {
          const val = parseFloat((<HTMLInputElement>ev.target).value);
          this.onValueChange(val);
        }
      });
  }

  ngOnDestroy() {
    this.destroyed$.next(true);
  }
  //#endregion

  //#region ControlValueAccessor implementation
  registerOnChange(fn: (_: any) => void) {
    this.onValueChange = fn;
  }
  
  registerOnTouched(fn: () => void) {
    this.onTouched = fn;
  }

  writeValue(value: number) {
    if (this.host.slider) {
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
