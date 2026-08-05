import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  forwardRef,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { BsControlValidityDirective, BsForwardAriaDirective } from '@mintplayer/ng-bootstrap/a11y';
import type {
  CountryChangeEventDetail,
  MpPhoneInput,
  PhoneChangeEventDetail,
} from '@mintplayer/web-components/phone-input';

// Side-effect import: registers <mp-phone-input> (and, transitively, the
// <mp-input-group> and <mp-select> it composes).
import '@mintplayer/web-components/phone-input';

/**
 * `<bs-phone-input>` — a phone-number form control: country picker with flags,
 * a dial code that cannot be edited away, and as-you-type formatting.
 *
 * The control value is **E.164** (`'+32470123456'`), or `null` while empty, so a
 * form posts one canonical string. `(phoneChange)` carries the decomposed parts
 * for consumers that need them — note `valid` is `undefined` until the selected
 * country's validation rules have loaded, which is deliberate rather than
 * optimistic.
 *
 * ```html
 * <bs-form>
 *   <bs-phone-input [(ngModel)]="phone" default-country="be"
 *                   [errorMessages]="{ required: 'Enter a phone number.' }" />
 * </bs-form>
 * ```
 */
@Component({
  selector: 'bs-phone-input',
  templateUrl: './phone-input.component.html',
  imports: [BsForwardAriaDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => BsPhoneInputComponent), multi: true },
  ],
  hostDirectives: [{
    directive: BsControlValidityDirective,
    inputs: ['errorMessages'],
  }],
})
export class BsPhoneInputComponent implements ControlValueAccessor {
  private readonly destroyRef = inject(DestroyRef);
  private onChange: (value: string | null) => void = () => undefined;
  private onTouched: () => void = () => undefined;
  /** Set by `setDisabledState` before the view exists, applied by the effect. */
  private disabledByForm = false;

  private readonly phoneInput = viewChild.required<ElementRef<MpPhoneInput>>('phoneInput');

  /** ISO 3166-1 alpha-2, lowercase. Two-way via `(countryChange)`. */
  readonly country = input<string | null>(null);
  /** Country to start on when the value is empty. */
  readonly defaultCountry = input<string | null>(null);
  /** BCP-47 tag for country names and their ordering. Omitted = browser locale. */
  readonly locale = input<string | null>(null);
  readonly preferredCountries = input<readonly string[] | null>(null);
  readonly allowedCountries = input<readonly string[] | null>(null);
  readonly placeholder = input<string | null>(null);
  readonly autocomplete = input<string>('tel-national');
  /** Accessible name of the number field. */
  readonly inputLabel = input<string | null>(null);
  /** Accessible name of the country picker. */
  readonly countryLabel = input<string | null>(null);

  readonly countryChange = output<string>();
  /** The full detail: E.164 value plus country, dial code, digits and validity. */
  readonly phoneChange = output<PhoneChangeEventDetail>();

  protected readonly preferredAttr = computed(() => this.preferredCountries()?.join(',') ?? null);
  protected readonly allowedAttr = computed(() => this.allowedCountries()?.join(',') ?? null);

  constructor() {
    effect(() => {
      const el = this.phoneInput()?.nativeElement;
      if (el) el.disabled = this.disabledByForm;
    });
  }

  writeValue(value: string | null): void {
    const el = this.phoneInput()?.nativeElement;
    // The WC decomposes E.164 into country + national digits itself, so the
    // accessor never has to parse — and a value arriving before the view exists
    // is applied by the same assignment once it does.
    if (el) el.value = value ?? null;
  }

  registerOnChange(fn: (value: string | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabledByForm = isDisabled;
    const el = this.phoneInput()?.nativeElement;
    if (el) el.disabled = isDisabled;
  }

  protected onValueChange(ev: Event): void {
    const detail = (ev as CustomEvent<PhoneChangeEventDetail>).detail;
    if (this.destroyRef.destroyed) return;
    this.onChange(detail.value);
    this.phoneChange.emit(detail);
  }

  protected onCountryChange(ev: Event): void {
    const detail = (ev as CustomEvent<CountryChangeEventDetail>).detail;
    if (this.destroyRef.destroyed) return;
    // A country change is a user interaction with the control, and the number is
    // usually still empty at that point — without this the field can never be
    // touched, so a `required` error would never surface.
    this.onTouched();
    this.countryChange.emit(detail.country);
  }
}
