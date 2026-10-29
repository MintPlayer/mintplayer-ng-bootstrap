import { Directive, forwardRef, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/**
 * Angular forms for `bs-rating`, attached as a host directive so `ngModel`,
 * `formControl` and `formControlName` work without an extra import. The
 * component reads `written` and `disabled`, and reports user picks through
 * `changed`; a form write never echoes back as a change.
 */
@Directive({
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => BsRatingValueAccessor),
    multi: true,
  }],
  host: {
    '(focusout)': 'onTouched?.()',
  },
})
export class BsRatingValueAccessor implements ControlValueAccessor {
  /** The last value a form wrote; `undefined` until one does. */
  readonly written = signal<number | undefined>(undefined);
  readonly disabled = signal(false);

  private onChange?: (value: number) => void;
  onTouched?: () => void;

  changed(value: number) {
    this.onChange?.(value);
  }

  //#region ControlValueAccessor implementation
  registerOnChange(fn: (value: number) => void) {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void) {
    this.onTouched = fn;
  }

  writeValue(value: number | null | undefined) {
    this.written.set(typeof value === 'number' ? value : 0);
  }

  setDisabledState(isDisabled: boolean) {
    this.disabled.set(isDisabled);
  }
  //#endregion
}
