import { Directive, DoCheck, ElementRef, Injector, inject } from '@angular/core';
import { NgControl, Validators } from '@angular/forms';

/**
 * Mirrors the host form control's validity onto the wrapped web component:
 * `invalid` (only once touched — Bootstrap's own convention, and untouched
 * pristine forms must not scream) and `required` (from the control's
 * validators). The WC maps them to `aria-invalid`/`aria-required` on its
 * inner role-bearing input, which is the node screen readers actually read.
 *
 * The attribute lands on the wrapper's first element child — every nested
 * host wrapper renders its `mp-*` element as the template root — NOT on the
 * `bs-*` host, which has no role for AT to read it from.
 *
 * NgControl is resolved lazily via the injector: injecting it in the
 * constructor recurses (NgControl resolution needs the value accessor being
 * constructed). ngDoCheck keeps the mirror live at every CD pass, which is
 * exactly the cadence Angular updates control state at (PRD 11a).
 */
@Directive({
  selector: '[bsControlValidity]',
})
export class BsControlValidityDirective implements DoCheck {
  private readonly injector = inject(Injector);
  private readonly host = inject(ElementRef) as ElementRef<HTMLElement>;
  /** undefined = not resolved yet; null = no form control on this host. */
  private ngControl: NgControl | null | undefined;

  ngDoCheck(): void {
    if (this.ngControl === undefined) {
      this.ngControl = this.injector.get(NgControl, null);
    }
    const control = this.ngControl;
    const target = this.host.nativeElement.firstElementChild;
    if (!control || !target) return;

    const invalid = !!control.invalid && !!control.touched;
    if (invalid) target.setAttribute('invalid', '');
    else target.removeAttribute('invalid');

    // requiredTrue is the checkbox-shaped required; hasValidator compares by
    // reference, so both spellings must be probed.
    const required =
      (control.control?.hasValidator(Validators.required) ?? false) ||
      (control.control?.hasValidator(Validators.requiredTrue) ?? false);
    if (required) target.setAttribute('required', '');
    else target.removeAttribute('required');
  }
}
