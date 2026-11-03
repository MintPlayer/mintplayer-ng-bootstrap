import { computed, inject } from '@angular/core';
import type { CheckboxGroupInputs } from '@mintplayer/ui-core/checkbox';
import { BsCheckboxGroupValueAccessor } from './checkbox-group.accessor';

/*
 * The Angular extension of the generated `bs-checkbox-group` (#458 D10 escape
 * hatch): Angular forms. A bound form control drives the selection, and a
 * disabled control disables the group.
 */

export const hostDirectives = [BsCheckboxGroupValueAccessor];

export function extendInputs(inputs: () => CheckboxGroupInputs): () => CheckboxGroupInputs {
  const accessor = inject(BsCheckboxGroupValueAccessor, { self: true });
  return computed<CheckboxGroupInputs>(() => {
    const value = inputs();
    return {
      ...value,
      value: accessor.bound() ? accessor.viewValue() : value.value,
      disabled: value.disabled || accessor.disabled(),
    };
  });
}
