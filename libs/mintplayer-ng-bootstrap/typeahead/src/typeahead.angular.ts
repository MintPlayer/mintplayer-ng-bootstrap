import { computed, inject } from '@angular/core';
import type { TypeaheadInputs } from '@mintplayer/ui-core/typeahead';
import { BsTypeaheadValueAccessor } from './typeahead.accessor';

/*
 * The Angular extension of the generated `bs-typeahead` (PRD #437 D10 escape
 * hatch): Angular forms. A bound form control drives the term and the
 * disabled state. (An Observable provider needs nothing here: the core
 * accepts any observable-like answer.)
 */

export const hostDirectives = [BsTypeaheadValueAccessor];

export function extendInputs(inputs: () => TypeaheadInputs): () => TypeaheadInputs {
  const accessor = inject(BsTypeaheadValueAccessor, { self: true });
  return computed<TypeaheadInputs>(() => {
    const value = inputs();
    return {
      ...value,
      value: accessor.bound() ? accessor.viewValue() : value.value,
      disabled: value.disabled || accessor.disabled(),
    };
  });
}
