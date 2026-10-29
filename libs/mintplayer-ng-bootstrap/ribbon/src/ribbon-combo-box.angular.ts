import { computed, inject } from '@angular/core';
import type { RibbonComboBoxInputs } from '@mintplayer/ui-core/ribbon';
import { BsRibbonComboBoxValueAccessor } from './value-accessor/ribbon-value-accessors';

/*
 * The Angular extension of the generated bs-ribbon-combo-box (PRD #437 D10 escape hatch):
 * Angular forms. A bound form control drives value and the disabled state.
 */
export const hostDirectives = [BsRibbonComboBoxValueAccessor];

export function extendInputs(inputs: () => RibbonComboBoxInputs): () => RibbonComboBoxInputs {
  const accessor = inject(BsRibbonComboBoxValueAccessor, { self: true });
  return computed<RibbonComboBoxInputs>(() => {
    const value = inputs();
    return { ...value, value: accessor.bound() ? accessor.viewValue() : value.value, disabled: value.disabled || accessor.disabled() };
  });
}
