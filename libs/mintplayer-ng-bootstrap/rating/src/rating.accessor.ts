import { Directive, ElementRef, forwardRef, inject, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { RATING_VALUE_ATTR } from '@mintplayer/ui-core/rating';

/**
 * The `ControlValueAccessor` of `bs-rating` (a host directive of the generated
 * component). The value is the picked star, 0 for none.
 */
@Directive({
  // Applied as a host directive only.
  selector: '[bsRatingAccessor]',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => BsRatingValueAccessor), multi: true }],
  host: {
    // The radios' change and blur events bubble to the host.
    '(change)': 'onNativeChange($event)',
    '(focusout)': 'onTouched()',
  },
})
export class BsRatingValueAccessor implements ControlValueAccessor {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /** A form control is bound: its value drives the stars, over the `value` input. */
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

  onNativeChange(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || !target.hasAttribute(RATING_VALUE_ATTR) || !this.host.contains(target)) return;
    const value = Number(target.value);
    this.viewValue.set(value);
    this.onChange(value);
  }
}
