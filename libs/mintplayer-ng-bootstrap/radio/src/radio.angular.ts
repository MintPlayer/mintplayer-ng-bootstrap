import { computed, inject } from '@angular/core';
import { BsControlValidityDirective } from '@mintplayer/ng-bootstrap/a11y/forms';
import type { RadioInputs } from '@mintplayer/ui-core/radio';

/*
 * The Angular extension of the generated `bs-radio` (#458 D10 escape hatch): a
 * form control's validity reaches the radio's ARIA and its message.
 */

export const hostDirectives = [{ directive: BsControlValidityDirective, inputs: ['errorMessages'] }];

export function extendInputs(inputs: () => RadioInputs): () => RadioInputs {
  const validity = inject(BsControlValidityDirective, { self: true });
  return computed<RadioInputs>(() => {
    const value = inputs();
    return {
      ...value,
      invalid: value.invalid || validity.invalid(),
      required: value.required || validity.required(),
      errorText: value.errorText ?? validity.errorText(),
    };
  });
}
