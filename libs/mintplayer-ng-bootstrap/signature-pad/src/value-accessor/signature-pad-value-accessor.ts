import { Directive, forwardRef, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import type { Signature } from '@mintplayer/web-components/signature-pad';

/**
 * Angular forms for `bs-signature-pad`, attached as a host directive so
 * `ngModel`, `formControl` and `formControlName` work without an extra import.
 * The component reads `written` and `disabled`, and reports what the user drew
 * or typed through `changed`; a form write never echoes back as a change.
 */
@Directive({
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => BsSignaturePadValueAccessor),
    multi: true,
  }],
  host: {
    '(focusout)': 'onTouched?.()',
  },
})
export class BsSignaturePadValueAccessor implements ControlValueAccessor {
  /** The last value a form wrote; `undefined` until one does. */
  readonly written = signal<Signature | undefined>(undefined);
  readonly disabled = signal(false);

  private onChange?: (value: Signature) => void;
  onTouched?: () => void;

  changed(value: Signature) {
    this.onChange?.(value);
  }

  //#region ControlValueAccessor implementation
  registerOnChange(fn: (value: Signature) => void) {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void) {
    this.onTouched = fn;
  }

  writeValue(value: Signature | null | undefined) {
    this.written.set(value ?? { strokes: [] });
  }

  setDisabledState(isDisabled: boolean) {
    this.disabled.set(isDisabled);
  }
  //#endregion
}
