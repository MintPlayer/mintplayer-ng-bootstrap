import { DestroyRef, Directive, Injector, OnInit, forwardRef, inject } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, NgControl } from '@angular/forms';
import { BsOtpInputComponent } from '../components/otp-input.component';
@Directive({
  selector: 'bs-otp-input',
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => BsOtpInputValueAccessor),
    multi: true,
  }],
  host: {
    '(value-change)': 'onValueChangeEvent($event)',
    '(focusout)': 'onTouchEvent()',
  },
})
export class BsOtpInputValueAccessor implements ControlValueAccessor, OnInit {
  private host = inject(BsOtpInputComponent);
  // Inject NgControl LAZILY via the injector. Eager `inject(NgControl)` here
  // creates a cycle: NgControl → NG_VALUE_ACCESSOR token → this directive →
  // NgControl. Looking it up in ngOnInit (after the form directive has
  // finished its own construction) breaks the cycle.
  private injector = inject(Injector);
  private destroyRef = inject(DestroyRef);
  private ngControl: NgControl | null = null;

  private onValueChange?: (value: string) => void;
  private onTouched?: () => void;

  ngOnInit(): void {
    this.ngControl = this.injector.get(NgControl, null);
    // Push invalid state to the WC whenever the form control's status or
    // touched state changes. Mirrors Bootstrap's .is-invalid convention: only
    // mark the boxes red after the control has been touched, otherwise we'd
    // light up a "required" field the moment the form mounts.
    if (!this.ngControl?.control) return;
    const sub = this.ngControl.statusChanges?.subscribe(() => this.syncInvalid());
    if (sub) this.destroyRef.onDestroy(() => sub.unsubscribe());
    // Sync once now in case the control was created already invalid+touched
    // (e.g. server-side validation rehydrate).
    queueMicrotask(() => this.syncInvalid());
  }

  protected onValueChangeEvent(ev: Event): void {
    if (!this.onValueChange) return;
    const detail = (ev as CustomEvent<string>).detail ?? '';
    this.onValueChange(detail);
  }

  protected onTouchEvent(): void {
    if (this.onTouched) this.onTouched();
    // Re-sync invalid on touch — statusChanges doesn't always fire on touched
    // alone, so we trigger the recompute here.
    this.syncInvalid();
  }

  private syncInvalid(): void {
    // Guard async-scheduled invocations: queueMicrotask in ngOnInit + the
    // statusChanges subscription are both possible after destroy. Reading
    // `host.elementRef()` (a required viewChild) on a destroyed view throws.
    if (this.destroyRef.destroyed) return;
    const ref = this.host.elementRef();
    if (!ref || !this.ngControl) return;
    const invalid = (this.ngControl.invalid ?? false) && (this.ngControl.touched ?? false);
    ref.nativeElement.invalid = invalid;
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onValueChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  writeValue(value: string | null | undefined): void {
    const ref = this.host.elementRef();
    if (!ref) return;
    ref.nativeElement.value = value ?? '';
  }

  setDisabledState(isDisabled: boolean): void {
    const ref = this.host.elementRef();
    if (!ref) return;
    if (isDisabled) {
      ref.nativeElement.setAttribute('disabled', '');
    } else {
      ref.nativeElement.removeAttribute('disabled');
    }
  }
}
