import { DestroyRef, Directive, ElementRef, Injector, OnInit, forwardRef, inject, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { BsOtpInputComponent } from '../generated';

/**
 * The `ControlValueAccessor` of `bs-otp-input` (a host directive of the
 * generated component, see `otp-input.angular.ts`). A bound form control drives
 * the code through `viewValue`; every change the user makes (typing, paste,
 * `clear()`, a layout change that drops characters) reaches the form through
 * the component's `value` model, which a form write never touches.
 */
@Directive({
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => BsOtpInputValueAccessor), multi: true }],
  host: {
    '(focusout)': 'onTouched()',
  },
})
export class BsOtpInputValueAccessor implements ControlValueAccessor, OnInit {
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);

  /** A form control drives the code: its `viewValue` wins over the `value` input. */
  readonly bound = signal(false);
  readonly viewValue = signal('');
  readonly disabled = signal(false);

  private onChange: (value: string) => void = () => undefined;
  onTouched: () => void = () => undefined;

  ngOnInit(): void {
    // The component is created after its host directives, so it is looked up here.
    const sub = this.injector.get(BsOtpInputComponent).value.subscribe((value) => {
      if (!this.bound() || value === this.viewValue()) return;
      this.viewValue.set(value);
      this.onChange(value);
    });
    this.destroyRef.onDestroy(() => sub.unsubscribe());
  }

  registerOnChange(fn: (value: string) => void): void {
    this.bound.set(true);
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  writeValue(value: string | null | undefined): void {
    this.viewValue.set(value ?? '');
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }
}

/**
 * `focus()` on the `bs-otp-input` host moves into its input, so a directive that
 * focuses the element it sits on (`autofocus` through FocusOnLoadDirective)
 * reaches the field.
 */
@Directive({})
export class BsOtpInputFocusDirective {
  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    Object.defineProperty(host, 'focus', {
      // Before the first render there is no input yet; try again once it exists.
      value: (options?: FocusOptions) => {
        const input = host.querySelector('input');
        if (input) input.focus(options);
        else queueMicrotask(() => host.querySelector('input')?.focus(options));
      },
      configurable: true,
      writable: true,
    });
  }
}
