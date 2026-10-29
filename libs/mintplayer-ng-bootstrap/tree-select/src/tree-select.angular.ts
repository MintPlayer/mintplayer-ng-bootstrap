import { computed, inject } from '@angular/core';
import type { TreeSelectInputs } from '@mintplayer/ui-core/tree-select';
import { BsTreeSelectValueAccessor } from './value-accessor/tree-select-value-accessor';

/*
 * The Angular extension of the generated `bs-tree-select` (PRD #437 D10 escape
 * hatch): Angular forms. A bound form control drives the value and the
 * disabled state.
 */

export const hostDirectives = [BsTreeSelectValueAccessor];

export function extendInputs(inputs: () => TreeSelectInputs): () => TreeSelectInputs {
  const accessor = inject(BsTreeSelectValueAccessor, { self: true });
  return computed<TreeSelectInputs>(() => {
    const value = inputs();
    return {
      ...value,
      value: accessor.bound() ? accessor.viewValue() : value.value,
      disabled: value.disabled || accessor.disabled(),
    };
  });
}
