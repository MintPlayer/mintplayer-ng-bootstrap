import { errorFeedback, type ErrorFeedback } from '@mintplayer/ui-core/forms';
import { isToggleButtonColor, type ToggleButtonColor } from '@mintplayer/ui-core/checkbox';

/**
 * Radio and radio group have no machine (PRD #437 §8, wave A; spike S2). Every
 * front renders native `<input type=radio>`s in ONE node tree under a shared
 * `name`, so the platform owns what `mp-radio-group` used to emulate across
 * shadow roots: one-of-N exclusivity, the single tab stop, arrow
 * move-and-select (wrapping, RTL-aware), `aria-posinset` / `aria-setsize`, and
 * one form submission. All of it works with JavaScript off.
 *
 * What the fronts share is the class mapping, the bags, and the group name.
 * The compound channel (DI / context / provide) only carries the group's
 * `name`, selected `value` and `disabled` to the radios: the browser keeps the
 * order, so no child registration is needed.
 *
 * Markup per type:
 *
 * - `radio`: `<label class=form-check>` wrapping the input and a
 *   `<span class=form-check-label>`.
 * - `toggle_button`: the input (`btn-check`) followed by
 *   `<label class="btn btn-<color>" for=<input id>>`.
 */

export type RadioType = 'radio' | 'toggle_button';

export interface RadioState {
  readonly type: RadioType;
  readonly checked: boolean;
  readonly disabled: boolean;
  readonly required: boolean;
  readonly invalid: boolean;
  /** The group's name; a radio outside a group has none and is not exclusive. */
  readonly name: string | null;
  readonly value: string | null;
  readonly errorText: string | null;
}

export type RadioInputBag = Record<string, string | boolean | null>;

export interface RadioBags {
  readonly input: RadioInputBag;
  /** The `<label for>` of a toggle button; `null` for a radio, whose label wraps the input. */
  readonly labelFor: string | null;
  readonly feedback: ErrorFeedback['message'];
}

export interface RadioClasses {
  /** The wrapping `<label>`; `null` for a toggle button. */
  readonly root: string | null;
  readonly input: string;
  readonly label: string;
}

export function radioIds(rootId: string): { readonly input: string; readonly error: string } {
  return { input: `${rootId}-input`, error: `${rootId}-error` };
}

/** A toggle-button radio defaults to `secondary`, as the Angular `bs-radio` always did. */
export function radioClasses(type: RadioType, color: ToggleButtonColor = 'secondary', invalid = false): RadioClasses {
  const state = invalid ? ' is-invalid' : '';
  if (type === 'toggle_button') {
    return { root: null, input: `btn-check${state}`, label: `btn btn-${isToggleButtonColor(color) ? color : 'secondary'}` };
  }
  return { root: 'form-check', input: `form-check-input${state}`, label: 'form-check-label' };
}

/**
 * The input's attributes. `checked` is not in the bag: each front binds the
 * live property (and the attribute, for SSR). The radio role is native, so the
 * bag writes none and a front never forwards a consumer `role` onto the input.
 */
export function connectRadio(state: RadioState, rootId: string, extraDescribedBy?: string | null): RadioBags {
  const ids = radioIds(rootId);
  const error = errorFeedback(ids.error, state.errorText, state.invalid);
  const describedBy = [error.control['aria-describedby'], extraDescribedBy].filter(Boolean).join(' ') || null;
  return {
    input: {
      type: 'radio',
      id: ids.input,
      name: state.name,
      value: state.value,
      disabled: state.disabled,
      required: state.required,
      'aria-invalid': state.invalid ? 'true' : null,
      'aria-errormessage': error.control['aria-errormessage'],
      'aria-describedby': describedBy,
    },
    labelFor: state.type === 'toggle_button' ? ids.input : null,
    feedback: error.message,
  };
}

export interface RadioGroupState {
  readonly required: boolean;
  readonly disabled: boolean;
}

/** The name a group uses when the consumer gives none: derived from the front's root id, so SSR and client agree. */
export function radioGroupName(rootId: string): string {
  return `${rootId}-name`;
}

/**
 * The group element's attributes. `role=radiogroup` names the set for AT
 * (consumer `aria-label` / `aria-labelledby` go on the same element);
 * `aria-required` belongs on the group, since `required` on a radio means
 * "one of the set". `aria-disabled` mirrors a disabled group: the radios
 * themselves get the native `disabled`.
 */
export function connectRadioGroup(state: RadioGroupState): Record<string, string | null> {
  return {
    role: 'radiogroup',
    'aria-required': state.required ? 'true' : null,
    'aria-disabled': state.disabled ? 'true' : null,
  };
}
