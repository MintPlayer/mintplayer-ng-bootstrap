import { defineContext, defineCore, type CoreBag } from '@mintplayer/ui-core/component';
import { errorFeedback, type ErrorFeedback } from '@mintplayer/ui-core/forms';
import { isToggleButtonColor, type ToggleButtonColor } from '@mintplayer/ui-core/checkbox';

/**
 * Radio and radio group (#458 M3, one D10 group). Every front renders native
 * `<input type=radio>`s in ONE node tree under a shared `name`, so the platform
 * owns one-of-N exclusivity, the single tab stop, arrow move-and-select
 * (wrapping, RTL-aware), `aria-posinset` / `aria-setsize` and one form
 * submission, with JavaScript off as well.
 *
 * The group hands its radios a context (name, selection, disabled, required).
 * Nested groups (a radio list in a table cell, inside a table whose first column
 * is another group) resolve to the nearest provider, and every group listens
 * only to the `change` of radios whose nearest group element is its own
 * (`RADIO_GROUP_ATTR`), so an inner list never changes the outer selection.
 *
 * Markup per type, Bootstrap's canonical form in both: the root, the input,
 * then a `<label for>` sibling.
 *
 * - `radio`: the root is `div.form-check` (`form-check-inline` when `inline`).
 * - `toggle_button`: the root is out of the layout (`display: contents`), the
 *   input is `.btn-check` and the label `.btn.btn-<color>`.
 */

export type RadioType = 'radio' | 'toggle_button';

/** Marks a group's element: a radio belongs to the group whose element is its closest marked ancestor. */
export const RADIO_GROUP_ATTR = 'data-radio-group';

/** What a group hands its radios. Without a group, `grouped` is false and the radio is on its own. */
export interface RadioGroupContext {
  readonly grouped: boolean;
  readonly name: string | null;
  readonly value: string | null;
  readonly disabled: boolean;
  readonly required: boolean;
}

export const RADIO_GROUP = defineContext<RadioGroupContext>('radio-group', {
  grouped: false,
  name: null,
  value: null,
  disabled: false,
  required: false,
});

/** The name a group uses when the consumer gives none: derived from the root id, so SSR and client agree. */
export function radioGroupName(rootId: string): string {
  return `${rootId}-name`;
}

/** The group a changed radio belongs to: its closest marked ancestor. */
export function ownsRadio(group: Element, target: EventTarget | null): target is HTMLInputElement {
  return (
    target instanceof HTMLInputElement &&
    target.type === 'radio' &&
    target.parentElement?.closest(`[${RADIO_GROUP_ATTR}]`) === group
  );
}

// ---------------------------------------------------------------- radio

export interface RadioInputs {
  type: RadioType;
  /** Button colour of a `toggle_button`; ignored by `radio`. */
  color: ToggleButtonColor;
  /** A `radio` laid out inline (`form-check-inline`). */
  inline: boolean;
  /** The value the group reports when this radio is picked. */
  value: string | null;
  /** Checked state of a radio outside a group; inside one, the group's selection decides. */
  checked: boolean;
  /** Only for a radio outside a group; inside one, the group's name wins. */
  name: string | null;
  disabled: boolean;
  required: boolean;
  invalid: boolean;
  errorText: string | null;
  /** The input's accessible name when it has no visible label (a radio in a table row). */
  inputLabel: string | null;
}

export interface RadioView {
  readonly root: CoreBag;
  readonly input: CoreBag;
  readonly checked: boolean;
  readonly label: CoreBag;
  readonly feedback: ErrorFeedback['message'];
}

export interface RadioViewArgs {
  readonly id: string;
  readonly inputs: RadioInputs;
  readonly group: RadioGroupContext;
  readonly checked: boolean;
  readonly label: string | null;
}

export function connectRadio({ id, inputs, group, checked, label }: RadioViewArgs): RadioView {
  const inputId = `${id}-input`;
  const error = errorFeedback(`${id}-error`, inputs.errorText, inputs.invalid);
  const invalid = inputs.invalid ? ' is-invalid' : '';
  const toggle = inputs.type === 'toggle_button';
  const color = isToggleButtonColor(inputs.color) ? inputs.color : 'secondary';
  return {
    root: { class: toggle ? 'radio-toggle' : inputs.inline ? 'form-check form-check-inline' : 'form-check' },
    input: {
      type: 'radio',
      id: inputId,
      class: (toggle ? 'btn-check' : 'form-check-input') + invalid,
      name: group.grouped ? group.name : inputs.name,
      value: inputs.value,
      // The attribute, so the server-rendered page shows the selection; the property is bound live.
      checked: checked,
      disabled: inputs.disabled || group.disabled,
      required: inputs.required || group.required,
      'aria-label': label ?? inputs.inputLabel,
      'aria-invalid': inputs.invalid ? 'true' : null,
      'aria-errormessage': error.control['aria-errormessage'],
      'aria-describedby': error.control['aria-describedby'],
    },
    checked,
    label: { class: toggle ? `btn btn-${color}` : 'form-check-label', for: inputId },
    feedback: error.message,
  };
}

export const radioCore = defineCore<RadioInputs, { checked: boolean }, { view: RadioView }, { checkedChange: boolean }, RadioGroupContext>({
  consume: RADIO_GROUP,
  state: (inputs) => ({ checked: !!inputs.checked }),
  view: ({ inputs, state, id, context, label }) => {
    const checked = context.grouped ? context.value !== null && context.value === inputs.value : state.checked;
    return { view: connectRadio({ id, inputs, group: context, checked, label }) };
  },
  attach: (api) => {
    const input = api.host.querySelector<HTMLInputElement>(':scope > input[type=radio]');
    if (!input) return;
    // A native radio fires change only when it becomes checked: by click, Space or an arrow key.
    const onChange = () => {
      api.setState({ checked: input.checked });
      api.emit('checkedChange', input.checked);
    };
    input.addEventListener('change', onChange);
    return () => input.removeEventListener('change', onChange);
  },
  inputsChanged: (api, prev) => {
    if (api.inputs().checked !== prev.checked) api.setState({ checked: !!api.inputs().checked });
  },
});

// ---------------------------------------------------------------- radio group

export interface RadioGroupInputs {
  /** The radios' shared name; generated when omitted, so native grouping always forms. */
  name: string | null;
  /** The selected radio's value. */
  value: string | null;
  /** Disables every radio of the group. */
  disabled: boolean;
  /** Marks the set required: `aria-required` on the group and `required` on every radio. */
  required: boolean;
}

/**
 * The group element's attributes. `role=radiogroup` names the set for AT (a
 * consumer `aria-label` / `aria-labelledby` goes on the same element);
 * `aria-required` belongs on the group, since `required` on a radio means "one
 * of the set". `aria-disabled` mirrors a disabled group: the radios themselves
 * get the native `disabled`.
 */
export function connectRadioGroup({ required, disabled }: Pick<RadioGroupInputs, 'required' | 'disabled'>): CoreBag {
  return {
    role: 'radiogroup',
    [RADIO_GROUP_ATTR]: '',
    'aria-required': required ? 'true' : null,
    'aria-disabled': disabled ? 'true' : null,
  };
}

export const radioGroupCore = defineCore<
  RadioGroupInputs,
  { value: string | null },
  { root: CoreBag },
  { valueChange: string | null },
  undefined,
  RadioGroupContext
>({
  provides: RADIO_GROUP,
  state: (inputs) => ({ value: inputs.value ?? null }),
  view: ({ inputs }) => ({ root: connectRadioGroup(inputs) }),
  provide: ({ inputs, state, id }) => ({
    grouped: true,
    name: inputs.name ?? radioGroupName(id),
    value: state.value,
    disabled: inputs.disabled,
    required: inputs.required,
  }),
  attach: (api) => {
    const onChange = (event: Event) => {
      if (!ownsRadio(api.host, event.target)) return;
      api.setState({ value: event.target.value });
      api.emit('valueChange', event.target.value);
    };
    api.host.addEventListener('change', onChange);
    return () => api.host.removeEventListener('change', onChange);
  },
  inputsChanged: (api, prev) => {
    if (api.inputs().value !== prev.value) api.setState({ value: api.inputs().value ?? null });
  },
});
