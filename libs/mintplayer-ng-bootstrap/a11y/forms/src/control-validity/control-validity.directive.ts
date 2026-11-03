import { Directive, DoCheck, ElementRef, Injector, inject, input, signal } from '@angular/core';
import { NgControl, Validators } from '@angular/forms';

/**
 * Reads the host form control's validity: `invalid` (only once touched —
 * Bootstrap's own convention, and untouched pristine forms must not scream),
 * `required` (from the control's validators) and, when `[errorMessages]`
 * supplies one, the message for the first active error.
 *
 * A front that renders its own template injects this directive and reads the
 * signals into its core's attribute bags, so `aria-invalid` /
 * `aria-errormessage` / `aria-describedby` land on the role-bearing node it
 * owns. A wrapper that still renders an `mp-*` element as its template root
 * (#437, until that component converts) gets the same state mirrored as the
 * WC's `invalid` / `required` / `error-text` attributes instead.
 *
 * NgControl is resolved lazily via the injector: injecting it in the
 * constructor recurses (NgControl resolution needs the value accessor being
 * constructed). ngDoCheck keeps the state live at every CD pass, which is
 * exactly the cadence Angular updates control state at (PRD 11a); it runs
 * before the host's own view is checked, so the signals are fresh for it.
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
   * The message for the first active error becomes the control's error
   * message node. A key with no message simply produces no message, so a
   * consumer can spell out the errors worth announcing and leave the rest to
   * the visible form summary.
   */
  readonly errorMessages = input<Record<string, string> | null>(null);

  private readonly invalidState = signal(false);
  private readonly requiredState = signal(false);
  private readonly errorTextState = signal<string | null>(null);

  /** The control is invalid AND touched. */
  readonly invalid = this.invalidState.asReadonly();
  readonly required = this.requiredState.asReadonly();
  /** Tied to `invalid`: `aria-errormessage` is only defined while the control is `aria-invalid`. */
  readonly errorText = this.errorTextState.asReadonly();

  ngDoCheck(): void {
    if (this.ngControl === undefined) {
      this.ngControl = this.injector.get(NgControl, null);
    }
    const control = this.ngControl;
    if (!control) return;

    const invalid = !!control.invalid && !!control.touched;
    // requiredTrue is the checkbox-shaped required; hasValidator compares by
    // reference, so both spellings must be probed.
    const required =
      (control.control?.hasValidator(Validators.required) ?? false) ||
      (control.control?.hasValidator(Validators.requiredTrue) ?? false);
    const errorText = invalid ? this.activeMessage(control) : null;

    this.invalidState.set(invalid);
    this.requiredState.set(required);
    this.errorTextState.set(errorText);

    const target = this.host.nativeElement.firstElementChild;
    if (target?.localName.includes('-')) {
      this.mirror(target, 'invalid', invalid ? '' : null);
      this.mirror(target, 'required', required ? '' : null);
      this.mirror(target, 'error-text', errorText);
    }
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
   * when the value is identical — which schedules a Lit render.
   */
  private mirror(target: Element, name: string, value: string | null): void {
    if (value === null) {
      if (target.hasAttribute(name)) target.removeAttribute(name);
    } else if (target.getAttribute(name) !== value) {
      target.setAttribute(name, value);
    }
  }
}
