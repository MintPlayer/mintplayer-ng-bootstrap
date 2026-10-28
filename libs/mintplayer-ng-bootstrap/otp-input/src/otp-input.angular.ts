import { computed, inject } from '@angular/core';
import { BsControlValidityDirective } from '@mintplayer/ng-bootstrap/a11y';
import type { OtpInputInputs } from '@mintplayer/ui-core/otp-input';
import { BsOtpInputFocusDirective, BsOtpInputValueAccessor } from './value-accessor/otp-input-value-accessor';

/*
 * The Angular extension of the generated `bs-otp-input` (PRD #437 D10 escape
 * hatch): Angular forms, and host focus. A bound form control drives the value
 * and the disabled state, and its validity reaches the input's ARIA and message.
 */

export const hostDirectives = [
  BsOtpInputValueAccessor,
  BsOtpInputFocusDirective,
  { directive: BsControlValidityDirective, inputs: ['errorMessages'] },
];

export function extendInputs(inputs: () => OtpInputInputs): () => OtpInputInputs {
  const accessor = inject(BsOtpInputValueAccessor, { self: true });
  const validity = inject(BsControlValidityDirective, { self: true });
  return computed<OtpInputInputs>(() => {
    const value = inputs();
    return {
      ...value,
      value: accessor.bound() ? accessor.viewValue() : value.value,
      disabled: value.disabled || accessor.disabled(),
      invalid: value.invalid || validity.invalid(),
      required: value.required || validity.required(),
      errorText: value.errorText ?? validity.errorText(),
    };
  });
}
