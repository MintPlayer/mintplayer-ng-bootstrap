import { DestroyRef, Directive, Injector, OnInit, effect, forwardRef, inject, signal, untracked } from '@angular/core';
import {
  AbstractControl,
  ControlValueAccessor,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  ValidationErrors,
  Validator,
} from '@angular/forms';
import { minutesOfDay } from '@mintplayer/ui-core/timepicker';
import { BsTimepickerComponent } from '../generated';

/**
 * The `ControlValueAccessor` and `Validator` of `bs-timepicker` (a host
 * directive of the generated component, see `timepicker.angular.ts`). A bound
 * form control drives the picked time through `viewValue`; a pick reaches the
 * form through the component's `selectedTime` model, which a form write never
 * echoes. A null form value clears the field.
 *
 * Validation compares times of day: `min` (`{ min, actual }`) and `max`
 * (`{ max, actual }`).
 */
@Directive({
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => BsTimepickerValueAccessor), multi: true },
    { provide: NG_VALIDATORS, useExisting: forwardRef(() => BsTimepickerValueAccessor), multi: true },
  ],
  host: {
    '(focusout)': 'onTouched()',
  },
})
export class BsTimepickerValueAccessor implements ControlValueAccessor, Validator, OnInit {
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  private component?: BsTimepickerComponent;

  /** A form control drives the time: its `viewValue` wins over the `selectedTime` input. */
  readonly bound = signal(false);
  readonly viewValue = signal<Date | null>(null);
  readonly disabled = signal(false);

  private onChange: (value: Date | null) => void = () => undefined;
  onTouched: () => void = () => undefined;
  private onValidatorChange: () => void = () => undefined;

  ngOnInit(): void {
    // The component is created after its host directives, so it is looked up here.
    const component = (this.component = this.injector.get(BsTimepickerComponent));
    const sub = component.selectedtimechange.subscribe((value) => {
      if (!this.bound() || minutesOfDay(value) === minutesOfDay(this.viewValue())) return;
      this.viewValue.set(value);
      this.onChange(value);
    });
    this.destroyRef.onDestroy(() => sub.unsubscribe());
    // The limits are inputs: a change re-runs validation.
    effect(
      () => {
        component.min();
        component.max();
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
    const minutes = minutesOfDay(value)!;
    const min = component.min();
    const max = component.max();
    const errors: ValidationErrors = {
      ...(min && minutes < minutesOfDay(min)! ? { min: { min, actual: value } } : {}),
      ...(max && minutes > minutesOfDay(max)! ? { max: { max, actual: value } } : {}),
    };
    return Object.keys(errors).length ? errors : null;
  }
}
