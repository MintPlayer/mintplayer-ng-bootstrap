import { DestroyRef, Directive, Injector, OnInit, forwardRef, inject, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { emptySignature, type Signature } from '@mintplayer/ui-core/signature-pad';
import { BsSignaturePadComponent } from '../generated';

/**
 * The `ControlValueAccessor` of `bs-signature-pad` (a host directive of the
 * generated component, see `signature-pad.angular.ts`), so `ngModel`,
 * `formControl` and `formControlName` work without an extra import. A bound
 * form control drives the signature through `viewValue`; what the user draws
 * or types reaches the form through the component's `signature` model, which a
 * form write never echoes.
 */
@Directive({
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => BsSignaturePadValueAccessor), multi: true }],
  host: {
    '(focusout)': 'onTouched()',
  },
})
export class BsSignaturePadValueAccessor implements ControlValueAccessor, OnInit {
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);

  /** A form control drives the signature: its `viewValue` wins over the `signature` input. */
  readonly bound = signal(false);
  readonly viewValue = signal<Signature>(emptySignature());
  readonly disabled = signal(false);

  private onChange: (value: Signature) => void = () => undefined;
  onTouched: () => void = () => undefined;

  ngOnInit(): void {
    // The component is created after its host directives, so it is looked up here.
    const component = this.injector.get(BsSignaturePadComponent);
    const sub = component.signaturechange.subscribe((value) => {
      if (!this.bound() || value === this.viewValue()) return;
      this.viewValue.set(value);
      this.onChange(value);
    });
    this.destroyRef.onDestroy(() => sub.unsubscribe());
  }

  registerOnChange(fn: (value: Signature) => void): void {
    this.bound.set(true);
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  writeValue(value: Signature | null | undefined): void {
    this.viewValue.set(value ?? emptySignature());
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }
}
