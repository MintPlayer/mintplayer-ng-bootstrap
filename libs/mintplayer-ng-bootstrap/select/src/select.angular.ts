import { computed, inject } from '@angular/core';
import { BsControlValidityDirective } from '@mintplayer/ng-bootstrap/a11y';
import type { SelectInputs } from '@mintplayer/ui-core/select';
import { BsSelectValueAccessor } from './value-accessors/select-value-accessor';

/*
 * The Angular extension of the generated `bs-select` (PRD #437 D10 escape
 * hatch): Angular forms. A bound form control drives the value and the
 * disabled state, and its validity reaches the select's ARIA and message.
 */

export const hostDirectives = [
  { directive: BsSelectValueAccessor, inputs: ['compareWith'] },
  { directive: BsControlValidityDirective, inputs: ['errorMessages'] },
];

export function extendInputs(inputs: () => SelectInputs): () => SelectInputs {
  const accessor = inject(BsSelectValueAccessor, { self: true });
  const validity = inject(BsControlValidityDirective, { self: true });
  const merged = computed<SelectInputs>(() => {
    const value = inputs();
    const bound = accessor.bound();
    return {
      ...value,
      value: bound ? accessor.viewValue() : value.value,
      disabled: value.disabled || accessor.disabled(),
      invalid: value.invalid || validity.invalid(),
      required: value.required || validity.required(),
      errorText: value.errorText ?? validity.errorText(),
    };
  });
  accessor.selected = computed(() => merged().value);
  return merged;
}
