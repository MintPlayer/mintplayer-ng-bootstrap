import { computed, inject } from '@angular/core';
import type { RibbonColorPickerInputs } from '@mintplayer/ui-core/ribbon';
import { BsRibbonColorPickerValueAccessor } from './value-accessor/ribbon-value-accessors';

/*
 * The Angular extension of the generated bs-ribbon-color-picker (PRD #437 D10 escape hatch):
 * Angular forms. A bound form control drives color and the disabled state.
 */
export const hostDirectives = [BsRibbonColorPickerValueAccessor];

export function extendInputs(inputs: () => RibbonColorPickerInputs): () => RibbonColorPickerInputs {
  const accessor = inject(BsRibbonColorPickerValueAccessor, { self: true });
  return computed<RibbonColorPickerInputs>(() => {
    const value = inputs();
    return { ...value, color: accessor.bound() ? accessor.viewValue() : value.color, disabled: value.disabled || accessor.disabled() };
  });
}
