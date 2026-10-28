import { computed, inject } from '@angular/core';
import { BsControlValidityDirective } from '@mintplayer/ng-bootstrap/a11y';
import type { DatepickerInputs } from '@mintplayer/ui-core/datepicker';
import { BsDatepickerValueAccessor } from './value-accessor/datepicker-value-accessor';

/*
 * The Angular extension of the generated `bs-datepicker` (PRD #437 D10 escape
 * hatch): Angular forms. A bound form control drives the picked day and the
 * disabled state, its validity reaches the field's ARIA and message, and it is
 * validated against min, max and disableDateFn.
 */

export const hostDirectives = [
  BsDatepickerValueAccessor,
  { directive: BsControlValidityDirective, inputs: ['errorMessages'] },
];

export function extendInputs(inputs: () => DatepickerInputs): () => DatepickerInputs {
  const accessor = inject(BsDatepickerValueAccessor, { self: true });
  const validity = inject(BsControlValidityDirective, { self: true });
  return computed<DatepickerInputs>(() => {
    const value = inputs();
    return {
      ...value,
      selectedDate: accessor.bound() ? accessor.viewValue() : value.selectedDate,
      disabled: value.disabled || accessor.disabled(),
      invalid: value.invalid || validity.invalid(),
      required: value.required || validity.required(),
      errorText: value.errorText ?? validity.errorText(),
    };
  });
}
