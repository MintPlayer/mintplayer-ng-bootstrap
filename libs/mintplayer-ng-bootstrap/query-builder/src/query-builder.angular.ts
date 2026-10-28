import { computed, inject } from '@angular/core';
import type { QueryBuilderInputs } from '@mintplayer/ui-core/query-builder';
import { BsQueryBuilderValueAccessor } from './value-accessor/query-builder-value-accessor';

/*
 * The Angular extension of the generated `bs-query-builder` (PRD #437 D10
 * escape hatch): Angular forms. A bound form control drives the tree and the
 * disabled state.
 */

export const hostDirectives = [BsQueryBuilderValueAccessor];

export function extendInputs(inputs: () => QueryBuilderInputs): () => QueryBuilderInputs {
  const accessor = inject(BsQueryBuilderValueAccessor, { self: true });
  return computed<QueryBuilderInputs>(() => {
    const value = inputs();
    return {
      ...value,
      query: accessor.bound() ? accessor.viewValue() : value.query,
      disabled: value.disabled || accessor.disabled(),
    };
  });
}
