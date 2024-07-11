import { AfterViewInit, DestroyRef, Directive, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { BsCheckboxComponent } from '../../component/checkbox.component';
import { fromEvent } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Directive({
  selector: 'bs-checkbox',
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => BsCheckboxValueAccessorDirective),
    multi: true,
  }],
})
export class BsCheckboxValueAccessorDirective implements ControlValueAccessor, AfterViewInit {
  constructor(private component: BsCheckboxComponent, private destroy: DestroyRef) {}

  onValueChange?: (value: boolean) => void;
  onTouched?: () => void;

  ngAfterViewInit() {
    const check = this.component.check()!.nativeElement;
    fromEvent(check, 'change')
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe((ev) => {
        this.onValueChange && this.onValueChange(check.checked);
      });
  }

  registerOnChange(fn: any) {
    this.onValueChange = fn;
  }

  registerOnTouched(fn: any) {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean) {
    this.component.isEnabled.set(!isDisabled);
  }

  writeValue(isChecked: boolean) {
    const check = this.component.check()!.nativeElement;
    check.checked = isChecked;
  }
}
