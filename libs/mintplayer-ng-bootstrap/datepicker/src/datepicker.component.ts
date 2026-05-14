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
import type { FirstDayOfWeek } from '@mintplayer/ng-bootstrap/calendar';
import { MpDatepickerElement } from './lib/web-components/mp-datepicker.element';

// Side-effect: registers <mp-datepicker>.
void MpDatepickerElement;

function dateOnly(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

@Component({
  selector: 'bs-datepicker',
  templateUrl: './datepicker.component.html',
  styleUrls: ['./datepicker.component.scss'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => BsDatepickerComponent), multi: true },
    { provide: NG_VALIDATORS, useExisting: forwardRef(() => BsDatepickerComponent), multi: true },
  ],
})
export class BsDatepickerComponent implements AfterViewInit, ControlValueAccessor, Validator {
  selectedDate = model<Date>(new Date());
  currentMonth = model<Date>(new Date());
  disableDateFn = input<((date: Date) => boolean) | undefined>(undefined);
  min = input<Date | undefined>(undefined);
  max = input<Date | undefined>(undefined);
  firstDayOfWeek = input<FirstDayOfWeek>(1);
  locale = input<string | undefined>(undefined);
  placeholder = input<string>('');
  triggerLabel = input<string>('Choose date');

  /** Disabled state driven by form's disable() (via setDisabledState) or [disabled] input. */
  protected readonly formDisabled = signal(false);
  disabled = input<boolean>(false);
  protected readonly effectiveDisabled = signal(false);

  readonly wcRef = viewChild<ElementRef<MpDatepickerElement>>('wc');

  private onChange: (value: Date | null) => void = () => {};
  private onTouched: () => void = () => {};
  private onValidatorChange: () => void = () => {};

  constructor() {
    // Mirror inputs to the WC.
    effect(() => {
      const wc = this.wcRef()?.nativeElement;
      if (!wc) return;
      wc.selectedDate = this.selectedDate();
      wc.currentMonth = this.currentMonth();
      wc.disableDateFn = this.disableDateFn() ?? null;
      wc.min = this.min() ?? null;
      wc.max = this.max() ?? null;
      wc.firstDayOfWeek = this.firstDayOfWeek();
      wc.locale = this.locale();
      wc.placeholder = this.placeholder();
      wc.triggerLabel = this.triggerLabel();
      wc.disabled = this.effectiveDisabled();
      wc.requestUpdate();
    });

    // Effective disabled = input OR form-disabled.
    effect(() => {
      this.effectiveDisabled.set(this.disabled() || this.formDisabled());
    });

    // Notify validator pipeline when min/max/disableDateFn change.
    effect(() => {
      // Establish reactive deps.
      this.min();
      this.max();
      this.disableDateFn();
      this.onValidatorChange();
    });
  }

  ngAfterViewInit(): void {
    // Initial sync via effect once viewChild resolves.
  }

  onSelectedDateChange(event: Event): void {
    const detail = (event as CustomEvent<Date>).detail;
    if (!(detail instanceof Date)) return;
    this.selectedDate.set(detail);
    this.onChange(detail);
  }

  onCurrentMonthChange(event: Event): void {
    const detail = (event as CustomEvent<Date>).detail;
    if (detail instanceof Date) this.currentMonth.set(detail);
  }

  onClosed(): void {
    // Treat closing the popup as a "touched" event for forms.
    this.onTouched();
  }

  /* ---- ControlValueAccessor ---- */

  writeValue(value: Date | null | undefined): void {
    if (value instanceof Date) {
      this.selectedDate.set(value);
    }
    // If value is null/undefined, leave the model alone — Angular forms call
    // writeValue(null) on form reset; we honor it by leaving the prior date
    // as a stable default. Consumers wanting to clear should bind to value or
    // use a separate clear gesture.
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
