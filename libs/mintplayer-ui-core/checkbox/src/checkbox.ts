import { errorFeedback, type ErrorFeedback } from '@mintplayer/ui-core/forms';

/**
 * The checkbox has no machine (PRD #437 §8, wave A): the native
 * `<input type=checkbox>` IS the state, so it submits, toggles and announces
 * with JavaScript off. What the fronts share is the class mapping and the
 * attribute bag for the input, so the ARIA contract is written in one place.
 *
 * Markup per type (every front renders the same):
 *
 * - `checkbox` / `switch`: `<label class=form-check[ form-switch]>` wrapping
 *   the input and a `<span class=form-check-label>`; the wrapping label names
 *   the input with no id.
 * - `toggle_button`: the input (`btn-check`) followed by
 *   `<label class="btn btn-<color>" for=<input id>>`.
 *
 * `checked` is NOT in the bag: it is a live property that each front binds
 * natively (and, for SSR, as the attribute). `indeterminate` has no attribute
 * at all, so a front sets the property after render; `aria-checked=mixed`
 * carries the state for AT and for the no-JS DOM.
 */

export type CheckboxType = 'checkbox' | 'switch' | 'toggle_button';

export const TOGGLE_BUTTON_COLORS = [
  'primary', 'secondary', 'success', 'danger', 'warning', 'info', 'light', 'dark',
  'outline-primary', 'outline-secondary', 'outline-success', 'outline-danger',
  'outline-warning', 'outline-info', 'outline-light', 'outline-dark',
] as const;
export type ToggleButtonColor = (typeof TOGGLE_BUTTON_COLORS)[number];

export function isToggleButtonColor(value: unknown): value is ToggleButtonColor {
  return (TOGGLE_BUTTON_COLORS as readonly unknown[]).includes(value);
}

export interface CheckboxState {
  readonly type: CheckboxType;
  readonly checked: boolean;
  readonly indeterminate: boolean;
  readonly disabled: boolean;
  readonly required: boolean;
  readonly invalid: boolean;
  readonly name: string | null;
  readonly value: string | null;
  readonly errorText: string | null;
}

export type CheckboxInputBag = Record<string, string | boolean | null>;

export interface CheckboxBags {
  readonly input: CheckboxInputBag;
  /** The `<label for>` of a toggle button; `null` for checkbox / switch, whose label wraps the input. */
  readonly labelFor: string | null;
  readonly feedback: ErrorFeedback['message'];
}

export interface CheckboxClasses {
  /** The wrapping `<label>`; `null` for a toggle button, which has no wrapper. */
  readonly root: string | null;
  readonly input: string;
  readonly label: string;
}

export function checkboxIds(rootId: string): { readonly input: string; readonly error: string } {
  return { input: `${rootId}-input`, error: `${rootId}-error` };
}

/** `invalid` adds Bootstrap's `is-invalid` (red border, red label) to the input. */
export function checkboxClasses(type: CheckboxType, color: ToggleButtonColor = 'primary', invalid = false): CheckboxClasses {
  const state = invalid ? ' is-invalid' : '';
  if (type === 'toggle_button') {
    return { root: null, input: `btn-check${state}`, label: `btn btn-${isToggleButtonColor(color) ? color : 'primary'}` };
  }
  return {
    root: type === 'switch' ? 'form-check form-switch' : 'form-check',
    input: `form-check-input${state}`,
    label: 'form-check-label',
  };
}

/**
 * The input's attributes. `role` is part of the contract for a switch, so a
 * front never forwards a consumer role over it. `extraDescribedBy` merges a consumer's own
 * describedby ids after the error message.
 */
export function connectCheckbox(state: CheckboxState, rootId: string, extraDescribedBy?: string | null): CheckboxBags {
  const ids = checkboxIds(rootId);
  const toggle = state.type === 'toggle_button';
  const error = errorFeedback(ids.error, state.errorText, state.invalid);
  const describedBy = [error.control['aria-describedby'], extraDescribedBy].filter(Boolean).join(' ') || null;
  return {
    input: {
      type: 'checkbox',
      id: ids.input,
      name: state.name,
      value: state.value,
      disabled: state.disabled,
      required: state.required,
      // A toggle button keeps the native checkbox role: its checked state is the
      // only one AT can read that stays true with JS off (tier 1). An aria-pressed
      // written from JS would freeze at its server value.
      role: state.type === 'switch' ? 'switch' : null,
      'aria-checked': !toggle && state.indeterminate ? 'mixed' : null,
      'aria-invalid': state.invalid ? 'true' : null,
      'aria-required': state.required ? 'true' : null,
      'aria-errormessage': error.control['aria-errormessage'],
      'aria-describedby': describedBy,
    },
    labelFor: toggle ? ids.input : null,
    feedback: error.message,
  };
}

/** The mixed state is a property of the checkbox/switch only; a toggle button has no visual for it. */
export function effectiveIndeterminate(state: Pick<CheckboxState, 'type' | 'indeterminate'>): boolean {
  return state.indeterminate && state.type !== 'toggle_button';
}
