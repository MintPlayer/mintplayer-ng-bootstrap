import { DestroyRef, Directive, Injector, OnInit, effect, forwardRef, inject, signal, untracked } from '@angular/core';
import {
  AbstractControl,
  ControlValueAccessor,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  ValidationErrors,
  Validator,
} from '@angular/forms';
import { BsDatetimePickerComponent } from '../generated';

/**
 * The `ControlValueAccessor` and `Validator` of `bs-datetime-picker` (a host
 * directive of the generated component, see `datetime-picker.angular.ts`). A
 * bound form control drives the value through `viewValue`; a user's change
 * reaches the form through the component's `value` model, which a form write
 * never echoes.
 *
 * Validation: `min` / `max` compare the full date and time (`{ min, actual }`,
 * `{ max, actual }`), the same bounds the grid and the list enforce, and
 * `disabledDate` reports a day `disableDateFn` refuses.
 */
@Directive({
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => BsDatetimePickerValueAccessor), multi: true },
    { provide: NG_VALIDATORS, useExisting: forwardRef(() => BsDatetimePickerValueAccessor), multi: true },
  ],
  host: {
    '(focusout)': 'onTouched()',
  },
})
export class BsDatetimePickerValueAccessor implements ControlValueAccessor, Validator, OnInit {
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  private component?: BsDatetimePickerComponent;

  /** A form control drives the value: its `viewValue` wins over the `value` input. */
  readonly bound = signal(false);
  readonly viewValue = signal<Date | null>(null);
  readonly disabled = signal(false);

  private onChange: (value: Date | null) => void = () => undefined;
  onTouched: () => void = () => undefined;
  private onValidatorChange: () => void = () => undefined;

  ngOnInit(): void {
    // The component is created after its host directives, so it is looked up here.
    const component = (this.component = this.injector.get(BsDatetimePickerComponent));
    const sub = component.valuechange.subscribe((value) => {
      if (!this.bound() || value?.getTime() === this.viewValue()?.getTime()) return;
      this.viewValue.set(value);
      this.onChange(value);
    });
    this.destroyRef.onDestroy(() => sub.unsubscribe());
    // The limits are inputs: a change re-runs validation.
    effect(
      () => {
        component.min();
        component.max();
        component.disableDateFn();
        untracked(() => this.onValidatorChange());
      },
      { injector: this.injector },
    );
  }

  registerOnChange(fn: (value: Date | null) => void): void {
    this.bound.set(true);
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  registerOnValidatorChange(fn: () => void): void {
    this.onValidatorChange = fn;
  }

  writeValue(value: Date | null | undefined): void {
    this.viewValue.set(value instanceof Date ? value : null);
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  validate(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    const component = this.component;
    if (!(value instanceof Date) || !component) return null;
    const min = component.min();
    const max = component.max();
    const disable = component.disableDateFn();
    const errors: ValidationErrors = {
      ...(min && value.getTime() < min.getTime() ? { min: { min, actual: value } } : {}),
      ...(max && value.getTime() > max.getTime() ? { max: { max, actual: value } } : {}),
      ...(disable?.(value) ? { disabledDate: true } : {}),
    };
    return Object.keys(errors).length ? errors : null;
  }
}
