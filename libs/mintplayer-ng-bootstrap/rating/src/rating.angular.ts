import { computed, inject } from '@angular/core';
import type { RatingInputs } from '@mintplayer/ui-core/rating';
import { BsRatingValueAccessor } from './rating.accessor';

/*
 * The Angular extension of the generated `bs-rating` (#458 D10 escape hatch):
 * Angular forms. A bound form control drives the value, and a disabled
 * control disables the stars.
 */

export const hostDirectives = [BsRatingValueAccessor];

export function extendInputs(inputs: () => RatingInputs): () => RatingInputs {
  const accessor = inject(BsRatingValueAccessor, { self: true });
  return computed<RatingInputs>(() => {
    const value = inputs();
    return {
      ...value,
      value: accessor.bound() ? accessor.viewValue() : value.value,
      disabled: value.disabled || accessor.disabled(),
    };
  });
}
