import { computed, inject } from '@angular/core';
import { BsControlValidityDirective } from '@mintplayer/ng-bootstrap/a11y';
import type { DatetimePickerInputs } from '@mintplayer/ui-core/datetime-picker';
import { BsDatetimePickerValueAccessor } from './value-accessor/datetime-picker-value-accessor';

/*
 * The Angular extension of the generated `bs-datetime-picker` (PRD #437 D10
 * escape hatch): Angular forms. A bound form control drives the value and the
 * disabled state, its validity reaches the field's ARIA and message, and it is
 * validated against min, max and disableDateFn.
 */

export const hostDirectives = [
  BsDatetimePickerValueAccessor,
  { directive: BsControlValidityDirective, inputs: ['errorMessages'] },
];

export function extendInputs(inputs: () => DatetimePickerInputs): () => DatetimePickerInputs {
  const accessor = inject(BsDatetimePickerValueAccessor, { self: true });
  const validity = inject(BsControlValidityDirective, { self: true });
  return computed<DatetimePickerInputs>(() => {
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
