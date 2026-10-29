import { computed, inject } from '@angular/core';
import { BsControlValidityDirective } from '@mintplayer/ng-bootstrap/a11y';
import type { TimepickerInputs } from '@mintplayer/ui-core/timepicker';
import { BsTimepickerValueAccessor } from './value-accessor/timepicker-value-accessor';

/*
 * The Angular extension of the generated `bs-timepicker` (PRD #437 D10 escape
 * hatch): Angular forms. A bound form control drives the picked time and the
 * disabled state, its validity reaches the field's ARIA and message, and it is
 * validated against min and max.
 */

export const hostDirectives = [
  BsTimepickerValueAccessor,
  { directive: BsControlValidityDirective, inputs: ['errorMessages'] },
];

export function extendInputs(inputs: () => TimepickerInputs): () => TimepickerInputs {
  const accessor = inject(BsTimepickerValueAccessor, { self: true });
  const validity = inject(BsControlValidityDirective, { self: true });
  return computed<TimepickerInputs>(() => {
    const value = inputs();
    return {
      ...value,
      selectedTime: accessor.bound() ? accessor.viewValue() : value.selectedTime,
      disabled: value.disabled || accessor.disabled(),
      invalid: value.invalid || validity.invalid(),
      required: value.required || validity.required(),
      errorText: value.errorText ?? validity.errorText(),
    };
  });
}
