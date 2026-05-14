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
  output,
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
import type { FirstDayOfWeek } from '@mintplayer/ng-bootstrap/calendar';
import type { Hour12Mode, TimeStep } from '@mintplayer/ng-bootstrap/timepicker';
import { MpDatetimePickerElement, type DatetimePopup } from './lib/web-components/mp-datetime-picker.element';

void MpDatetimePickerElement;

export interface TimePartInput {
  hour: number;
  minute: number;
}

function dateOnly(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

@Component({
  selector: 'bs-datetime-picker',
  templateUrl: './datetime-picker.component.html',
  styleUrls: ['./datetime-picker.component.scss'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => BsDatetimePickerComponent), multi: true },
    { provide: NG_VALIDATORS, useExisting: forwardRef(() => BsDatetimePickerComponent), multi: true },
  ],
})
export class BsDatetimePickerComponent implements AfterViewInit, ControlValueAccessor, Validator {
  value = model<Date | null>(null);

  min = input<Date | undefined>(undefined);
  max = input<Date | undefined>(undefined);
  disableDateFn = input<((date: Date) => boolean) | undefined>(undefined);
  firstDayOfWeek = input<FirstDayOfWeek>(1);
  locale = input<string | undefined>(undefined);
  hour12 = input<Hour12Mode>('auto');
  step = input<TimeStep>(15);
  defaultTime = input<TimePartInput>({ hour: 0, minute: 0 });
  placeholder = input<string>('');
  showClear = input<boolean>(false);
  dateButtonLabel = input<string>('Choose date');
  timeButtonLabel = input<string>('Choose time');
  clearLabel = input<string>('Clear');
  todayLabel = input<string>('Today');
  nowLabel = input<string>('Now');

  disabled = input<boolean>(false);
  protected readonly formDisabled = signal(false);
  protected readonly effectiveDisabled = signal(false);

  readonly opened = output<DatetimePopup>();
  readonly closed = output<DatetimePopup>();

  readonly wcRef = viewChild<ElementRef<MpDatetimePickerElement>>('wc');

  private onChange: (value: Date | null) => void = () => {};
  private onTouched: () => void = () => {};
  private onValidatorChange: () => void = () => {};

  constructor() {
    effect(() => {
      const wc = this.wcRef()?.nativeElement;
      if (!wc) return;
      wc.value = this.value();
      wc.min = this.min() ?? null;
      wc.max = this.max() ?? null;
      wc.disableDateFn = this.disableDateFn() ?? null;
      wc.firstDayOfWeek = this.firstDayOfWeek();
      wc.locale = this.locale();
      wc.hour12 = this.hour12();
      wc.step = this.step();
      wc.defaultTime = this.defaultTime();
      wc.placeholder = this.placeholder();
      wc.showClear = this.showClear();
      wc.dateButtonLabel = this.dateButtonLabel();
      wc.timeButtonLabel = this.timeButtonLabel();
      wc.clearLabel = this.clearLabel();
      wc.todayLabel = this.todayLabel();
      wc.nowLabel = this.nowLabel();
      wc.disabled = this.effectiveDisabled();
      wc.requestUpdate?.();
    });

    effect(() => {
      this.effectiveDisabled.set(this.disabled() || this.formDisabled());
    });

    effect(() => {
      this.min();
      this.max();
      this.disableDateFn();
      this.onValidatorChange();
    });
  }

  ngAfterViewInit(): void {}

  onValueChange(event: Event): void {
    const detail = (event as CustomEvent<Date | null>).detail;
    const next: Date | null = detail instanceof Date ? detail : null;
    this.value.set(next);
    this.onChange(next);
  }

  onOpened(event: Event): void {
    const detail = (event as CustomEvent<DatetimePopup>).detail;
    this.opened.emit(detail);
  }

  onClosed(event: Event): void {
    const detail = (event as CustomEvent<DatetimePopup>).detail;
    this.closed.emit(detail);
    this.onTouched();
  }

  /* ---- ControlValueAccessor ---- */

  writeValue(value: Date | null | undefined): void {
    if (value instanceof Date) {
      this.value.set(value);
    } else if (value === null) {
      this.value.set(null);
    }
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
    if (min && dateOnly(value) < dateOnly(min)) {
      errors['min'] = { min, actual: value };
    }
    if (max && dateOnly(value) > dateOnly(max)) {
      errors['max'] = { max, actual: value };
    }
    const fn = this.disableDateFn();
    if (fn && fn(value)) errors['disabledDate'] = true;
    return Object.keys(errors).length ? errors : null;
  }

  registerOnValidatorChange(fn: () => void): void {
    this.onValidatorChange = fn;
  }
}
