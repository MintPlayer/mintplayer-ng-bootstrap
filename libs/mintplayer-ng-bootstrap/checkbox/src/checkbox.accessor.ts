import { Directive, ElementRef, forwardRef, inject, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/**
 * The `ControlValueAccessor` of a single checkbox or toggle button (a host
 * directive of the generated `bs-checkbox` and `bs-toggle-button`). The value is
 * the checked state.
 */
@Directive({
  // Applied as a host directive only.
  selector: '[bsCheckboxAccessor]',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => BsCheckboxValueAccessor), multi: true }],
  host: {
    // The native input's change and blur bubble to the host.
    '(change)': 'onNativeChange($event)',
    '(focusout)': 'onTouched()',
  },
})
export class BsCheckboxValueAccessor implements ControlValueAccessor {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /** A form control is bound: its value drives the checkbox, over its own `checked`. */
  readonly bound = signal(false);
  /** The checked state as the form control or the user last set it. */
  readonly viewValue = signal(false);
  readonly disabled = signal(false);

  private onChange: (value: boolean) => void = () => undefined;
  onTouched: () => void = () => undefined;

  registerOnChange(fn: (value: boolean) => void): void {
    this.bound.set(true);
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  writeValue(value: boolean | null): void {
    this.viewValue.set(!!value);
  }

  onNativeChange(event: Event): void {
    const target = event.target;
    // Only this checkbox's own input: not one projected into its label.
    if (!(target instanceof HTMLInputElement) || target.type !== 'checkbox' || target.parentElement !== this.host) return;
    this.viewValue.set(target.checked);
    this.onChange(target.checked);
  }
}
