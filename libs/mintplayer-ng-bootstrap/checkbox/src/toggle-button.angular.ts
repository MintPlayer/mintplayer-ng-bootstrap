import { computed, inject } from '@angular/core';
import { BsControlValidityDirective } from '@mintplayer/ng-bootstrap/a11y/forms';
import type { ToggleButtonInputs } from '@mintplayer/ui-core/checkbox';
import { BsCheckboxValueAccessor } from './checkbox.accessor';

/*
 * The Angular extension of the generated `bs-toggle-button` (#458 D10 escape
 * hatch): the checkbox's, since a toggle button is a checkbox.
 */

export const hostDirectives = [
  BsCheckboxValueAccessor,
  { directive: BsControlValidityDirective, inputs: ['errorMessages'] },
];

export function extendInputs(inputs: () => ToggleButtonInputs): () => ToggleButtonInputs {
  const accessor = inject(BsCheckboxValueAccessor, { self: true });
  const validity = inject(BsControlValidityDirective, { self: true });
  return computed<ToggleButtonInputs>(() => {
    const value = inputs();
    return {
      ...value,
      checked: accessor.bound() ? accessor.viewValue() : value.checked,
      disabled: value.disabled || accessor.disabled(),
      invalid: value.invalid || validity.invalid(),
      required: value.required || validity.required(),
      errorText: value.errorText ?? validity.errorText(),
    };
  });
}
