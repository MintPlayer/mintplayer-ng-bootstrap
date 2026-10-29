import { computed, inject } from '@angular/core';
import { BsControlValidityDirective } from '@mintplayer/ng-bootstrap/a11y';
import type { PhoneInputInputs } from '@mintplayer/ui-core/phone-input';
import { BsPhoneInputFocusDirective, BsPhoneInputValueAccessor } from './value-accessor/phone-input-value-accessor';

/*
 * The Angular extension of the generated `bs-phone-input` (PRD #437 D10 escape
 * hatch): Angular forms, and host focus. A bound form control drives the value
 * and the disabled state, and its validity reaches the number field's ARIA and
 * message.
 */

export const hostDirectives = [
  BsPhoneInputValueAccessor,
  BsPhoneInputFocusDirective,
  { directive: BsControlValidityDirective, inputs: ['errorMessages'] },
];

export function extendInputs(inputs: () => PhoneInputInputs): () => PhoneInputInputs {
  const accessor = inject(BsPhoneInputValueAccessor, { self: true });
  const validity = inject(BsControlValidityDirective, { self: true });
  return computed<PhoneInputInputs>(() => {
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
