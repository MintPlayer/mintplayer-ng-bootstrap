import { computed, inject } from '@angular/core';
import type { RibbonCheckBoxInputs } from '@mintplayer/ui-core/ribbon';
import { BsRibbonCheckBoxValueAccessor } from './value-accessor/ribbon-value-accessors';

/*
 * The Angular extension of the generated bs-ribbon-check-box (PRD #437 D10 escape hatch):
 * Angular forms. A bound form control drives checked and the disabled state.
 */
export const hostDirectives = [BsRibbonCheckBoxValueAccessor];

export function extendInputs(inputs: () => RibbonCheckBoxInputs): () => RibbonCheckBoxInputs {
  const accessor = inject(BsRibbonCheckBoxValueAccessor, { self: true });
  return computed<RibbonCheckBoxInputs>(() => {
    const value = inputs();
    return { ...value, checked: accessor.bound() ? accessor.viewValue() : value.checked, disabled: value.disabled || accessor.disabled() };
  });
}
