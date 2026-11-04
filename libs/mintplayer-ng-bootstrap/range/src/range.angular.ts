import { computed, inject } from '@angular/core';
import type { RangeInputs } from '@mintplayer/ui-core/range';
import { BsRangeValueAccessor } from './range.accessor';

/*
 * The Angular extension of the generated `bs-range` (#458 D10 escape hatch):
 * Angular forms. A bound form control drives the value, and a disabled
 * control disables the slider.
 */

export const hostDirectives = [BsRangeValueAccessor];

export function extendInputs(inputs: () => RangeInputs): () => RangeInputs {
  const accessor = inject(BsRangeValueAccessor, { self: true });
  return computed<RangeInputs>(() => {
    const value = inputs();
    return {
      ...value,
      value: accessor.bound() ? accessor.viewValue() : value.value,
      disabled: value.disabled || accessor.disabled(),
    };
  });
}
