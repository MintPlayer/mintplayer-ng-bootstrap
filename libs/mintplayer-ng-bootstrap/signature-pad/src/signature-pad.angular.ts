import { computed, inject } from '@angular/core';
import { BsControlValidityDirective } from '@mintplayer/ng-bootstrap/a11y';
import type { SignaturePadInputs } from '@mintplayer/ui-core/signature-pad';
import { BsSignaturePadValueAccessor } from './value-accessor/signature-pad-value-accessor';

/*
 * The Angular extension of the generated `bs-signature-pad` (PRD #437 D10
 * escape hatch): Angular forms. A bound form control drives the signature and
 * the disabled state, and its validity reaches the typed field's ARIA and the
 * message under the pad.
 */

export const hostDirectives = [
  BsSignaturePadValueAccessor,
  { directive: BsControlValidityDirective, inputs: ['errorMessages'] },
];

export function extendInputs(inputs: () => SignaturePadInputs): () => SignaturePadInputs {
  const accessor = inject(BsSignaturePadValueAccessor, { self: true });
  const validity = inject(BsControlValidityDirective, { self: true });
  return computed<SignaturePadInputs>(() => {
    const value = inputs();
    return {
      ...value,
      signature: accessor.bound() ? accessor.viewValue() : value.signature,
      disabled: value.disabled || accessor.disabled(),
      invalid: value.invalid || validity.invalid(),
      required: value.required || validity.required(),
      errorText: value.errorText ?? validity.errorText(),
    };
  });
}
