import { computed, inject } from '@angular/core';
import type { ColorPickerInputs } from '@mintplayer/ui-core/color-picker';
import { BsColorPickerValueAccessor } from './color-picker.accessor';

/*
 * The Angular extension of the generated `bs-color-picker` (#458 D10 escape hatch): Angular
 * forms. A bound form control drives the color, and a disabled control disables the picker.
 */

export const hostDirectives = [BsColorPickerValueAccessor];

export function extendInputs(inputs: () => ColorPickerInputs): () => ColorPickerInputs {
  const accessor = inject(BsColorPickerValueAccessor, { self: true });
  return computed<ColorPickerInputs>(() => {
    const value = inputs();
    return {
      ...value,
      value: accessor.bound() ? accessor.viewValue() : value.value,
      disabled: value.disabled || accessor.disabled(),
    };
  });
}
