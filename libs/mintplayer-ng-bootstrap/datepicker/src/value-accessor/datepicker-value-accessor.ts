import { DestroyRef, Directive, Injector, OnInit, effect, forwardRef, inject, signal, untracked } from '@angular/core';
import {
  AbstractControl,
  ControlValueAccessor,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  ValidationErrors,
  Validator,
} from '@angular/forms';
import { dateOnly, isSameDate } from '@mintplayer/ui-core/calendar';
import { BsDatepickerComponent } from '../generated';

/**
 * The `ControlValueAccessor` and `Validator` of `bs-datepicker` (a host
 * directive of the generated component, see `datepicker.angular.ts`). A bound
 * form control drives the picked day through `viewValue`; a pick reaches the
 * form through the component's `selectedDate` model, which a form write never
 * echoes. A null form value clears the field.
 *
 * Validation: `min` / `max` (`{ min, actual }`, `{ max, actual }`) and
 * `disabledDate` (the value is a day `disableDateFn` refuses).
 */
@Directive({
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => BsDatepickerValueAccessor), multi: true },
    { provide: NG_VALIDATORS, useExisting: forwardRef(() => BsDatepickerValueAccessor), multi: true },
  ],
  host: {
    '(focusout)': 'onTouched()',
  },
})
export class BsDatepickerValueAccessor implements ControlValueAccessor, Validator, OnInit {
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  private component?: BsDatepickerComponent;

  /** A form control drives the day: its `viewValue` wins over the `selectedDate` input. */
  readonly bound = signal(false);
  readonly viewValue = signal<Date | null>(null);
  readonly disabled = signal(false);

  private onChange: (value: Date | null) => void = () => undefined;
  onTouched: () => void = () => undefined;
  private onValidatorChange: () => void = () => undefined;

  ngOnInit(): void {
    // The component is created after its host directives, so it is looked up here.
    const component = (this.component = this.injector.get(BsDatepickerComponent));
    const sub = component.selecteddatechange.subscribe((value) => {
      if (!this.bound() || isSameDate(value, this.viewValue())) return;
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

  registerOnValidatorChange(fn: () => void): void {
    this.onValidatorChange = fn;
  }

  registerOnChange(fn: (value: Date | null) => void): void {
    this.bound.set(true);
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
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
    const day = dateOnly(value);
    const min = component.min();
    const max = component.max();
    const disable = component.disableDateFn();
    const errors: ValidationErrors = {
      ...(min && day < dateOnly(min) ? { min: { min, actual: value } } : {}),
      ...(max && day > dateOnly(max) ? { max: { max, actual: value } } : {}),
      ...(disable?.(value) ? { disabledDate: true } : {}),
    };
    return Object.keys(errors).length ? errors : null;
  }
}
