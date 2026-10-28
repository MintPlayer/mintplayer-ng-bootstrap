import { computed, inject } from '@angular/core';
import type { MultiRangeInputs } from '@mintplayer/ui-core/multi-range';
import { BsMultiRangeValueAccessor } from './value-accessor/multi-range-value-accessor';

/*
 * The Angular extension of the generated `bs-multi-range` (PRD #437 D10 escape
 * hatch): Angular forms. A bound form control drives the thumbs and the
 * disabled state.
 */

export const hostDirectives = [BsMultiRangeValueAccessor];

export function extendInputs(inputs: () => MultiRangeInputs): () => MultiRangeInputs {
  const accessor = inject(BsMultiRangeValueAccessor, { self: true });
  return computed<MultiRangeInputs>(() => {
    const value = inputs();
    return {
      ...value,
      value: accessor.bound() ? accessor.viewValue() : value.value,
      disabled: value.disabled || accessor.disabled(),
    };
  });
}
