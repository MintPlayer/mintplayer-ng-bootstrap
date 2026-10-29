import { computed, inject } from '@angular/core';
import type { RibbonToggleButtonInputs } from '@mintplayer/ui-core/ribbon';
import { BsRibbonToggleButtonValueAccessor } from './value-accessor/ribbon-value-accessors';

/*
 * The Angular extension of the generated bs-ribbon-toggle-button (PRD #437 D10 escape hatch):
 * Angular forms. A bound form control drives pressed and the disabled state.
 */
export const hostDirectives = [BsRibbonToggleButtonValueAccessor];

export function extendInputs(inputs: () => RibbonToggleButtonInputs): () => RibbonToggleButtonInputs {
  const accessor = inject(BsRibbonToggleButtonValueAccessor, { self: true });
  return computed<RibbonToggleButtonInputs>(() => {
    const value = inputs();
    return { ...value, pressed: accessor.bound() ? accessor.viewValue() : value.pressed, disabled: value.disabled || accessor.disabled() };
  });
}
