import { computed, inject } from '@angular/core';
import { BsControlValidityDirective } from '@mintplayer/ng-bootstrap/a11y/forms';
import type { CheckboxInputs } from '@mintplayer/ui-core/checkbox';
import { BsCheckboxValueAccessor } from './checkbox.accessor';

/*
 * The Angular extension of the generated `bs-checkbox` (#458 D10 escape hatch):
 * Angular forms. A bound form control drives the checked state, a disabled
 * control disables the input, and the control's validity reaches its ARIA and
 * its message.
 */

export const hostDirectives = [
  BsCheckboxValueAccessor,
  { directive: BsControlValidityDirective, inputs: ['errorMessages'] },
];

export function extendInputs(inputs: () => CheckboxInputs): () => CheckboxInputs {
  const accessor = inject(BsCheckboxValueAccessor, { self: true });
  const validity = inject(BsControlValidityDirective, { self: true });
  return computed<CheckboxInputs>(() => {
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
