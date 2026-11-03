import { Directive, ElementRef, forwardRef, inject, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/**
 * The `ControlValueAccessor` of `bs-range` (a host directive of the generated
 * component). The value is the slider's number.
 */
@Directive({
  // Applied as a host directive only.
  selector: '[bsRangeAccessor]',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => BsRangeValueAccessor), multi: true }],
  host: {
    // The native input's input and blur events bubble to the host.
    '(input)': 'onNativeInput($event)',
    '(focusout)': 'onTouched()',
  },
})
export class BsRangeValueAccessor implements ControlValueAccessor {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /** A form control is bound: its value drives the slider, over the `value` input. */
  readonly bound = signal(false);
  /** The value as the form control or the user last set it. */
  readonly viewValue = signal(0);
  readonly disabled = signal(false);

  private onChange: (value: number) => void = () => undefined;
  onTouched: () => void = () => undefined;

  registerOnChange(fn: (value: number) => void): void {
    this.bound.set(true);
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  writeValue(value: number | null): void {
    this.viewValue.set(typeof value === 'number' && !Number.isNaN(value) ? value : 0);
  }

  onNativeInput(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || target.type !== 'range' || !this.host.contains(target)) return;
    const value = parseFloat(target.value);
    if (Number.isNaN(value)) return;
    this.viewValue.set(value);
    this.onChange(value);
  }
}
