import { Directive, DoCheck, ElementRef, Injector, inject, input } from '@angular/core';
import { NgControl, Validators } from '@angular/forms';

/**
 * Mirrors the host form control's validity onto the wrapped web component:
 * `invalid` (only once touched — Bootstrap's own convention, and untouched
 * pristine forms must not scream), `required` (from the control's
 * validators) and, when `[errorMessages]` supplies one, `error-text`. The WC
 * maps them to `aria-invalid`/`aria-required`/`aria-errormessage` +
 * `aria-describedby` on its inner role-bearing input, which is the node screen
 * readers actually read.
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

  /**
   * Validation messages by `NgControl` error key, e.g.
   * `{ required: 'Pick a fruit.', minlength: 'Too short.' }`.
   *
   * The message for the first active error is written to the WC's `error-text`,
   * which renders it inside the shadow root and points the real control at it.
   * A key with no message simply produces no message, so a consumer can spell out
   * the errors worth announcing and leave the rest to the visible form summary.
   */
  readonly errorMessages = input<Record<string, string> | null>(null);

  ngDoCheck(): void {
    if (this.ngControl === undefined) {
      this.ngControl = this.injector.get(NgControl, null);
    }
    const control = this.ngControl;
    const target = this.host.nativeElement.firstElementChild;
    if (!control || !target) return;

    const invalid = !!control.invalid && !!control.touched;
    this.mirror(target, 'invalid', invalid ? '' : null);

    // requiredTrue is the checkbox-shaped required; hasValidator compares by
    // reference, so both spellings must be probed.
    const required =
      (control.control?.hasValidator(Validators.required) ?? false) ||
      (control.control?.hasValidator(Validators.requiredTrue) ?? false);
    this.mirror(target, 'required', required ? '' : null);

    // Tied to the same predicate as `invalid`, not just to `control.invalid`:
    // `aria-errormessage` is only defined while the control is `aria-invalid`, so
    // a message on an untouched control would be a reference to nothing.
    this.mirror(target, 'error-text', invalid ? this.activeMessage(control) : null);
  }

  /**
   * The message for the first of the control's active errors that has one.
   * Validators report in the order they were composed, so a required-then-pattern
   * field announces "required" until it has a value — the order the user meets
   * them in.
   */
  private activeMessage(control: NgControl): string | null {
    const messages = this.errorMessages();
    if (!messages) return null;
    const key = Object.keys(control.errors ?? {}).find((error) => error in messages);
    return key ? messages[key] : null;
  }

  /**
   * Writes only on a real change. `ngDoCheck` runs on every CD pass, and an
   * unconditional `setAttribute` fires the WC's `attributeChangedCallback` even
   * when the value is identical — which now schedules a Lit render, because these
   * attributes have to be live to be correct.
   */
  private mirror(target: Element, name: string, value: string | null): void {
    if (value === null) {
      if (target.hasAttribute(name)) target.removeAttribute(name);
    } else if (target.getAttribute(name) !== value) {
      target.setAttribute(name, value);
    }
  }
}
