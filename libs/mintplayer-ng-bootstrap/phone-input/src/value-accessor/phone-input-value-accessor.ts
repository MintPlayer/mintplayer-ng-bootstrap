import { DestroyRef, Directive, ElementRef, Injector, OnInit, forwardRef, inject, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { BsPhoneInputComponent } from '../generated';

/**
 * The `ControlValueAccessor` of `bs-phone-input` (a host directive of the
 * generated component, see `phone-input.angular.ts`). A bound form control
 * drives the E.164 value through `viewValue`; every change the user makes
 * (typing, paste, a country pick, rules that load and re-derive the E.164)
 * reaches the form through the component's `value` model, which a form write
 * never touches.
 */
@Directive({
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => BsPhoneInputValueAccessor), multi: true }],
  host: {
    '(focusout)': 'onTouched()',
  },
})
export class BsPhoneInputValueAccessor implements ControlValueAccessor, OnInit {
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);

  /** A form control drives the value: its `viewValue` wins over the `value` input. */
  readonly bound = signal(false);
  readonly viewValue = signal<string | null>(null);
  readonly disabled = signal(false);

  private onChange: (value: string | null) => void = () => undefined;
  onTouched: () => void = () => undefined;

  ngOnInit(): void {
    // The component is created after its host directives, so it is looked up here.
    const sub = this.injector.get(BsPhoneInputComponent).value.subscribe((value) => {
      if (!this.bound() || value === this.viewValue()) return;
      this.viewValue.set(value);
      this.onChange(value);
    });
    this.destroyRef.onDestroy(() => sub.unsubscribe());
  }

  registerOnChange(fn: (value: string | null) => void): void {
    this.bound.set(true);
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  writeValue(value: string | null | undefined): void {
    this.viewValue.set(value || null);
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }
}

/**
 * `focus()` on the `bs-phone-input` host moves into the number field, not the
 * country picker (D13), so a directive that focuses the element it sits on
 * reaches the field.
 */
@Directive({})
export class BsPhoneInputFocusDirective {
  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const tel = () => host.querySelector<HTMLInputElement>('input[type=tel]');
    Object.defineProperty(host, 'focus', {
      // Before the first render there is no input yet; try again once it exists.
      value: (options?: FocusOptions) => {
        const input = tel();
        if (input) input.focus(options);
        else queueMicrotask(() => tel()?.focus(options));
      },
      configurable: true,
      writable: true,
    });
  }
}
