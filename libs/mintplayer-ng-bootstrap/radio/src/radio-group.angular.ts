import { computed, inject } from '@angular/core';
import type { RadioGroupInputs } from '@mintplayer/ui-core/radio';
import { BsRadioGroupValueAccessor } from './radio-group.accessor';

/*
 * The Angular extension of the generated `bs-radio-group` (#458 D10 escape
 * hatch): Angular forms. A bound form control
 * drives the selection, and a disabled control disables the group.
 */

export const hostDirectives = [BsRadioGroupValueAccessor];

export function extendInputs(inputs: () => RadioGroupInputs): () => RadioGroupInputs {
  const accessor = inject(BsRadioGroupValueAccessor, { self: true });
  return computed<RadioGroupInputs>(() => {
    const value = inputs();
    return {
      ...value,
      value: accessor.bound() ? accessor.viewValue() : value.value,
      disabled: value.disabled || accessor.disabled(),
    };
  });
}
