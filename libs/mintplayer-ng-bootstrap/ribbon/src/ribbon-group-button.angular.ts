import { computed, inject } from '@angular/core';
import type { RibbonGroupButtonInputs } from '@mintplayer/ui-core/ribbon';
import { BsRibbonGroupButtonValueAccessor } from './value-accessor/ribbon-value-accessors';

/*
 * The Angular extension of the generated bs-ribbon-group-button (PRD #437 D10 escape hatch):
 * Angular forms. A bound form control drives selectedValue and the disabled state.
 */
export const hostDirectives = [BsRibbonGroupButtonValueAccessor];

export function extendInputs(inputs: () => RibbonGroupButtonInputs): () => RibbonGroupButtonInputs {
  const accessor = inject(BsRibbonGroupButtonValueAccessor, { self: true });
  return computed<RibbonGroupButtonInputs>(() => {
    const value = inputs();
    return { ...value, selectedValue: accessor.bound() ? accessor.viewValue() : value.selectedValue, disabled: value.disabled || accessor.disabled() };
  });
}
