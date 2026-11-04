import { defineContext, defineCore, type CoreBag } from '@mintplayer/ui-core/component';
import { errorFeedback, type ErrorFeedback } from '@mintplayer/ui-core/forms';

/**
 * Checkbox, switch, toggle button and checkbox group (#458 M4, one D10 group).
 * The native `<input type=checkbox>` IS the state, so it submits, toggles and
 * announces with JavaScript off (tier 1).
 *
 * Markup per type, Bootstrap's canonical form in every front: the root, the
 * input, then a `<label for>` sibling.
 *
 * - `checkbox` / `switch`: the root is `div.form-check[.form-switch]`.
 * - `toggle_button`: the root is out of the layout (`display: contents`), the
 *   input is `.btn-check` and the label `.btn.btn-<color>`.
 *
 * `checked` is bound as a live property (and as the attribute in the bag, so
 * server HTML shows it). `indeterminate` has no attribute: it is a property
 * binding, and `aria-checked=mixed` carries it for AT and for the no-JS DOM.
 *
 * A checkbox group hands its checkboxes a context (name, selected values,
 * disabled). Inside one, a checkbox submits as `<name>[]` and is checked when
 * its `value` is selected. Nested groups resolve to the nearest provider, and a
 * group listens only to the checkboxes whose nearest group element is its own
 * (`CHECKBOX_GROUP_ATTR`).
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

/** Marks a group's element: a checkbox belongs to the group whose element is its closest marked ancestor. */
export const CHECKBOX_GROUP_ATTR = 'data-checkbox-group';

/** What a group hands its checkboxes. Without a group, `grouped` is false and the checkbox is on its own. */
export interface CheckboxGroupContext {
  readonly grouped: boolean;
  /** The group's name; a member submits as `<name>[]`. */
  readonly name: string | null;
  readonly value: readonly string[];
  readonly disabled: boolean;
}

export const CHECKBOX_GROUP = defineContext<CheckboxGroupContext>('checkbox-group', {
  grouped: false,
  name: null,
  value: [],
  disabled: false,
});

/** The group a changed checkbox belongs to: its closest marked ancestor. */
export function ownsCheckbox(group: Element, target: EventTarget | null): target is HTMLInputElement {
  return (
    target instanceof HTMLInputElement &&
    target.type === 'checkbox' &&
    target.parentElement?.closest(`[${CHECKBOX_GROUP_ATTR}]`) === group
  );
}

/** A group's selection as its checkboxes show it: the checked ones' values, in document order. */
export function groupSelection(group: Element): string[] {
  return [...group.querySelectorAll<HTMLInputElement>('input[type=checkbox]')]
    .filter((input) => input.checked && ownsCheckbox(group, input))
    .map((input) => input.value);
}

// ---------------------------------------------------------------- checkbox

export interface CheckboxInputs {
  type: CheckboxType;
  /** Button colour of a `toggle_button`; ignored by the other types. */
  color: ToggleButtonColor;
  /** Checked state outside a group; inside one, the group's selection decides. */
  checked: boolean;
  /** The mixed state of a checkbox / switch. A user toggle clears it. */
  indeterminate: boolean;
  /** Only outside a group; inside one, the group's name (`<name>[]`) wins. */
  name: string | null;
  /** Submitted while checked, and the value a group selects. */
  value: string | null;
  disabled: boolean;
  required: boolean;
  invalid: boolean;
  errorText: string | null;
  /** The input's accessible name when it has no visible label (a checkbox in a table row). */
  inputLabel: string | null;
}

export type ToggleButtonInputs = Omit<CheckboxInputs, 'type' | 'indeterminate'>;

export interface CheckboxView {
  readonly root: CoreBag;
  readonly input: CoreBag;
  readonly checked: boolean;
  readonly indeterminate: boolean;
  readonly label: CoreBag;
  readonly feedback: ErrorFeedback['message'];
}

export interface CheckboxViewArgs {
  readonly id: string;
  readonly inputs: CheckboxInputs;
  readonly group: CheckboxGroupContext;
  readonly checked: boolean;
  readonly indeterminate: boolean;
  readonly label: string | null;
}

export function connectCheckbox({ id, inputs, group, checked, indeterminate, label }: CheckboxViewArgs): CheckboxView {
  const inputId = `${id}-input`;
  const error = errorFeedback(`${id}-error`, inputs.errorText, inputs.invalid);
  const invalid = inputs.invalid ? ' is-invalid' : '';
  const toggle = inputs.type === 'toggle_button';
  const color = isToggleButtonColor(inputs.color) ? inputs.color : 'primary';
  // The mixed state is a checkbox / switch property; a toggle button has no visual for it.
  const mixed = indeterminate && !toggle;
  const name = group.grouped ? (group.name === null ? null : `${group.name}[]`) : inputs.name;
  return {
    root: { class: toggle ? 'checkbox-toggle' : inputs.type === 'switch' ? 'form-check form-switch' : 'form-check' },
    input: {
      type: 'checkbox',
      id: inputId,
      class: (toggle ? 'btn-check' : 'form-check-input') + invalid,
      name,
      value: inputs.value,
      // The attribute, so the server-rendered page shows the state; the property is bound live.
      checked,
      disabled: inputs.disabled || group.disabled,
      required: inputs.required,
      // A switch's role is part of the contract. A toggle button keeps the native
      // checkbox role: its checked state stays true with JS off, where an
      // aria-pressed written from JS would freeze at its server value.
      role: inputs.type === 'switch' ? 'switch' : null,
      'aria-checked': mixed ? 'mixed' : null,
      'aria-label': label ?? inputs.inputLabel,
      'aria-required': inputs.required ? 'true' : null,
      'aria-invalid': inputs.invalid ? 'true' : null,
      'aria-errormessage': error.control['aria-errormessage'],
      'aria-describedby': error.control['aria-describedby'],
    },
    checked,
    indeterminate: mixed,
    label: { class: toggle ? `btn btn-${color}` : 'form-check-label', for: inputId },
    feedback: error.message,
  };
}

interface CheckboxState {
  checked: boolean;
  indeterminate: boolean;
}

interface CheckboxEvents {
}

/** The checkbox core, or the toggle button's: the same control with its type fixed. */
function checkboxCoreOf<I extends ToggleButtonInputs>(resolve: (inputs: I) => CheckboxInputs) {
  return defineCore<I, CheckboxState, { view: CheckboxView }, CheckboxEvents, CheckboxGroupContext>({
    consume: CHECKBOX_GROUP,
    state: (inputs) => ({ checked: !!inputs.checked, indeterminate: !!resolve(inputs).indeterminate }),
    view: ({ inputs, state, id, context, label }) => {
      const value = resolve(inputs);
      const checked = context.grouped ? value.value !== null && context.value.includes(value.value) : state.checked;
      return { view: connectCheckbox({ id, inputs: value, group: context, checked, indeterminate: state.indeterminate, label }) };
    },
    attach: (api) => {
      const input = api.host.querySelector<HTMLInputElement>(':scope > input[type=checkbox]');
      if (!input) return;
      const onChange = () => {
        // A user toggle always clears the mixed state, natively and here.
        api.setState({ checked: input.checked, indeterminate: false });
      };
      input.addEventListener('change', onChange);
      return () => input.removeEventListener('change', onChange);
    },
    inputsChanged: (api, prev) => {
      const inputs = api.inputs();
      if (inputs.checked !== prev.checked) api.setState({ checked: !!inputs.checked });
      const mixed = !!resolve(inputs).indeterminate;
      if (mixed !== !!resolve(prev as I).indeterminate) api.setState({ indeterminate: mixed });
    },
  });
}

export const checkboxCore = checkboxCoreOf<CheckboxInputs>((inputs) => inputs);

export const toggleButtonCore = checkboxCoreOf<ToggleButtonInputs>((inputs) => ({
  ...inputs,
  type: 'toggle_button',
  indeterminate: false,
}));

// ---------------------------------------------------------------- checkbox group

/** A checkbox group's value: the checked checkboxes' values. */
export type CheckboxGroupValue = readonly string[];

export interface CheckboxGroupInputs {
  /** The group's name: its checkboxes submit as `<name>[]`. */
  name: string | null;
  /** The selected checkboxes' values. */
  value: CheckboxGroupValue;
  /** Disables every checkbox of the group. */
  disabled: boolean;
}

/**
 * The group element's attributes. `role=group` makes the checkboxes announce as
 * one cluster, named by a consumer `aria-label` / `aria-labelledby` on the same
 * element. `aria-disabled` mirrors a disabled group: the checkboxes themselves
 * get the native `disabled`.
 */
export function connectCheckboxGroup({ disabled }: Pick<CheckboxGroupInputs, 'disabled'>): CoreBag {
  return {
    role: 'group',
    [CHECKBOX_GROUP_ATTR]: '',
    'aria-disabled': disabled ? 'true' : null,
  };
}

export const checkboxGroupCore = defineCore<
  CheckboxGroupInputs,
  { value: readonly string[] },
  { root: CoreBag },
  { valueChange: readonly string[] },
  undefined,
  CheckboxGroupContext
>({
  provides: CHECKBOX_GROUP,
  state: (inputs) => ({ value: inputs.value ?? [] }),
  view: ({ inputs }) => ({ root: connectCheckboxGroup(inputs) }),
  provide: ({ inputs, state }) => ({
    grouped: true,
    name: inputs.name,
    value: state.value,
    disabled: inputs.disabled,
  }),
  attach: (api) => {
    const onChange = (event: Event) => {
      if (!ownsCheckbox(api.host, event.target)) return;
      const value = groupSelection(api.host);
      api.setState({ value });
    };
    api.host.addEventListener('change', onChange);
    return () => api.host.removeEventListener('change', onChange);
  },
  inputsChanged: (api, prev) => {
    if (api.inputs().value !== prev.value) api.setState({ value: api.inputs().value ?? [] });
  },
});
