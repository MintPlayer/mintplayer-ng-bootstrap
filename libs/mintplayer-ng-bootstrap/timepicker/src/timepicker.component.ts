import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  effect,
  ElementRef,
  forwardRef,
  input,
  model,
  signal,
  viewChild,
} from '@angular/core';
import {
  AbstractControl,
  ControlValueAccessor,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  ValidationErrors,
  Validator,
} from '@angular/forms';
import { MpTimepickerElement } from './lib/web-components/mp-timepicker.element';
import type { Hour12Mode, TimeStep } from './lib/web-components/mp-time-list.element';

void MpTimepickerElement;

function timeMinutes(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

@Component({
  selector: 'bs-timepicker',
  templateUrl: './timepicker.component.html',
  styleUrls: ['./timepicker.component.scss'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => BsTimepickerComponent), multi: true },
    { provide: NG_VALIDATORS, useExisting: forwardRef(() => BsTimepickerComponent), multi: true },
  ],
})
export class BsTimepickerComponent implements AfterViewInit, ControlValueAccessor, Validator {
  selectedTime = model<Date>(new Date());
  isOpen = model(false);
  min = input<Date | undefined>(undefined);
  max = input<Date | undefined>(undefined);
  step = input<TimeStep>(15);
  hour12 = input<Hour12Mode>('auto');
  locale = input<string | undefined>(undefined);
  placeholder = input<string>('');
  triggerLabel = input<string>('Choose time');

  disabled = input<boolean>(false);
  protected readonly formDisabled = signal(false);
  protected readonly effectiveDisabled = signal(false);

  readonly wcRef = viewChild<ElementRef<MpTimepickerElement>>('wc');

  private onChange: (value: Date | null) => void = () => {};
  private onTouched: () => void = () => {};
  private onValidatorChange: () => void = () => {};

  constructor() {
    effect(() => {
      const wc = this.wcRef()?.nativeElement;
      if (!wc) return;
      wc.selectedTime = this.selectedTime();
      wc.step = this.step();
      wc.min = this.min() ?? null;
      wc.max = this.max() ?? null;
      wc.hour12 = this.hour12();
      wc.locale = this.locale();
      wc.placeholder = this.placeholder();
      wc.triggerLabel = this.triggerLabel();
      wc.disabled = this.effectiveDisabled();
      wc.requestUpdate?.();
    });

    effect(() => {
      this.effectiveDisabled.set(this.disabled() || this.formDisabled());
    });

    effect(() => {
      this.min();
      this.max();
      this.onValidatorChange();
    });
  }

  ngAfterViewInit(): void {}

  onSelectedTimeChange(event: Event): void {
    const detail = (event as CustomEvent<Date>).detail;
    if (!(detail instanceof Date)) return;
    this.selectedTime.set(detail);
    this.onChange(detail);
  }

  onOpened(): void {
    this.isOpen.set(true);
  }

  onClosed(): void {
    this.isOpen.set(false);
    this.onTouched();
  }

  /* ---- ControlValueAccessor ---- */

  writeValue(value: Date | null | undefined): void {
    if (value instanceof Date) this.selectedTime.set(value);
  }

  registerOnChange(fn: (value: Date | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.formDisabled.set(isDisabled);
  }

  /* ---- Validator ---- */

  validate(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!(value instanceof Date)) return null;
    const errors: ValidationErrors = {};
    const min = this.min();
    const max = this.max();
    const minutes = timeMinutes(value);
    if (min && minutes < timeMinutes(min)) errors['min'] = { min, actual: value };
    if (max && minutes > timeMinutes(max)) errors['max'] = { max, actual: value };
    return Object.keys(errors).length ? errors : null;
  }

  registerOnValidatorChange(fn: () => void): void {
    this.onValidatorChange = fn;
  }
}
