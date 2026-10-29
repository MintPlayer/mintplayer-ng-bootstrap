import { Directive, forwardRef, inject } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { BsCheckboxComponent } from '../component/checkbox.component';

/**
 * Single-mode (standalone) value accessor for `<bs-checkbox>`. Emits a
 * `boolean` reflecting the checked state. For multi-mode use, bind
 * `[formControl]` on `[bsCheckboxGroup]` instead — that directive owns
 * its own `string[]` accessor.
 */
@Directive({
  selector: 'bs-checkbox',
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => BsCheckboxValueAccessor),
    multi: true,
  }],
  host: {
    // The inner native input's change and blur bubble to the host.
    '(change)': 'onChangeEvent($event)',
    '(focusout)': 'onTouched?.()',
  },
})
export class BsCheckboxValueAccessor implements ControlValueAccessor {

  private host = inject(BsCheckboxComponent);

  onValueChange?: (value: boolean) => void;
  onTouched?: () => void;

  onChangeEvent(ev: Event) {
    const target = ev.target as HTMLInputElement | null;
    if (!this.onValueChange || target?.type !== 'checkbox') return;
    this.onValueChange(target.checked);
  }

  registerOnChange(fn: (_: boolean) => void) {
    this.onValueChange = fn;
  }

  registerOnTouched(fn: () => void) {
    this.onTouched = fn;
  }

  writeValue(value: boolean) {
    this.host.isToggled.set(value);
  }

  setDisabledState(isDisabled: boolean) {
    this.host.formDisabled.set(isDisabled);
  }
}
