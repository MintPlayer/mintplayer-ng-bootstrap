import { sharedInternals } from './host-aria';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Constructor<T = object> = new (...args: any[]) => T;

/**
 * The protocol a form-associated host implements on top of the mixin: the
 * mixin owns the ElementInternals plumbing; the host owns its value shape.
 * (Structurally typed — the mixin cannot require it in its base constraint
 * without breaking the TS mixin pattern, so implement it on the class.)
 */
export interface FormAssociatedHost {
  /** Current submission value (null = submit nothing). */
  formValue(): string | FormData | File | null;
  /** Reset to the markup-declared default (formResetCallback). */
  formReset(): void;
  /** Restore a value the browser saved (bfcache / autofill), default = adopt it. */
  formRestore?(state: string | FormData | File | null): void;
  /**
   * The focusable in-shadow control validity UI anchors to. Every choice
   * control already sets delegatesFocus, so this is its real input.
   */
  formValidityAnchor?(): HTMLElement | null;
}

export interface FormAssociatedElement {
  readonly internals: ElementInternals | null;
  /** Author-or-form-owner disabled — the only safe read (spike 0.3a). */
  readonly effectiveDisabled: boolean;
  syncFormValue(): void;
  setFormValidity(flags: ValidityStateFlags, message?: string): void;
}

/**
 * Form association (FACE) for the WC form controls — decision D5.
 *
 * Shares `attachInternals()` with `HostAriaController` through
 * `sharedInternals` (the call throws if made twice). Degrades to a no-op
 * where ElementInternals is missing (jsdom): the control still works, it
 * just does not submit.
 *
 * Disabled state carries spike 0.3a's mandatory design:
 *  - The UA writes NO attribute when a `<fieldset disabled>` disables the
 *    element, so the attribute alone is not a usable source of truth.
 *  - `formDisabledCallback` reports the PLATFORM's effective state (own
 *    attribute OR any ancestor fieldset) and its order relative to
 *    attributeChangedCallback is engine-dependent — so the mixin stores the
 *    callback value verbatim and `effectiveDisabled` ORs it with the author
 *    attribute. Order-independent and idempotent by construction; a property
 *    write can therefore never silently defeat a disabled fieldset
 *    (0.3a finding 4 — Angular's setDisabledState is exactly such a writer).
 */
// The explicit return type is load-bearing: without it, declaration emit
// tries to serialise the anonymous class and fails on the #private members
// (TS4094). It is also the mixin's public contract — consumers see
// FormAssociatedElement, not the plumbing.
export function FormAssociatedMixin<TBase extends Constructor<HTMLElement>>(
  Base: TBase,
): TBase & Constructor<FormAssociatedElement> {
  class FormAssociated extends Base implements FormAssociatedElement {
    static formAssociated = true;

    /** Effective disabled per the platform, as last reported by the UA. */
    #formDisabled = false;

    get internals(): ElementInternals | null {
      return sharedInternals(this);
    }

    get effectiveDisabled(): boolean {
      return this.#formDisabled || this.hasAttribute('disabled');
    }

    #host(): FormAssociatedHost {
      return this as unknown as FormAssociatedHost;
    }

    /** Push the host's current value into the form. Call on every change. */
    syncFormValue(): void {
      const internals = this.internals;
      if (!internals || typeof internals.setFormValue !== 'function') return;
      internals.setFormValue(this.#host().formValue());
    }

    setFormValidity(flags: ValidityStateFlags, message?: string): void {
      const internals = this.internals;
      if (!internals || typeof internals.setValidity !== 'function') return;
      const anchor = this.#host().formValidityAnchor?.() ?? undefined;
      const invalid = Object.values(flags).some(Boolean);
      internals.setValidity(flags, invalid ? message : undefined, anchor);
    }

    formDisabledCallback(disabled: boolean): void {
      // Stored verbatim — never derived from the attribute, whose write order
      // differs per engine (0.3a finding 3). No re-entry hazard: writing
      // fields here dispatches nothing.
      this.#formDisabled = disabled;
      (this as unknown as { requestUpdate?: () => void }).requestUpdate?.();
    }

    formResetCallback(): void {
      this.#host().formReset();
      this.syncFormValue();
    }

    formStateRestoreCallback(state: string | FormData | File | null): void {
      this.#host().formRestore?.(state);
      this.syncFormValue();
    }
  }
  return FormAssociated as unknown as TBase & Constructor<FormAssociatedElement>;
}
