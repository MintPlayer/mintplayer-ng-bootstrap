import { defineCore, type CoreApi } from '@mintplayer/ui-core/component';
import {
  connectSelect,
  readSelection,
  supportsBaseSelect,
  syncSelection,
  type SelectChangeEventDetail,
  type SelectItem,
  type SelectSize,
  type SelectView,
} from './select';

/**
 * The select's core (PRD #437 D10): what the generated Angular, React, Vue and
 * Lit components host. `select.component.ts` is its manifest and
 * `templates/select.view.vue` its markup.
 */

export interface SelectInputs {
  /** Bootstrap size: `sm`, `md` or `lg`. */
  size: SelectSize;
  /** A listbox that holds several values (`values`). */
  multiple: boolean;
  /** Rows shown at once; renders a listbox instead of a dropdown. */
  numberVisible?: number | null;
  disabled: boolean;
  required: boolean;
  /** Marks the control invalid and shows `errorText` under it. */
  invalid: boolean;
  /** The validation message, referenced from the select while `invalid`. */
  errorText?: string | null;
  /** Submitted with the form. */
  name?: string | null;
  /** Accessible name; an `aria-label` on the component wins. */
  inputLabel?: string | null;
  /** The selected value (single mode). Written through when the user picks. */
  value: string | null;
  /** The selected values (multiple mode). Written through when the user picks. */
  values: string[];
  /** The options; without it the component's `<option>` / `<optgroup>` children are. */
  options?: SelectItem[] | null;
}

export interface SelectState {
  value: string | null;
  values: string[];
}

export interface SelectEvents {
  valueChange: SelectChangeEventDetail;
}

type Api = CoreApi<SelectInputs, SelectState, SelectEvents>;

const sameValues = (a: readonly string[] | undefined, b: readonly string[] | undefined) =>
  a === b || (!!a && !!b && a.length === b.length && a.every((v, i) => v === b[i]));

const select = (api: Api) => api.host.querySelector('select') as HTMLSelectElement;
const sync = (api: Api) => syncSelection(select(api), api.inputs().multiple, api.state().value, api.state().values);

export const selectCore = defineCore<SelectInputs, SelectState, { view: SelectView }, SelectEvents>({
  state: (inputs) => ({ value: inputs.value ?? null, values: inputs.values ?? [] }),
  view: ({ inputs, state, id, hydrated, label }) => ({
    view: connectSelect({
      id,
      size: inputs.size,
      multiple: inputs.multiple,
      numberVisible: inputs.numberVisible ?? null,
      disabled: inputs.disabled,
      required: inputs.required,
      invalid: inputs.invalid,
      name: inputs.name ?? null,
      label: label ?? inputs.inputLabel ?? null,
      errorText: inputs.errorText ?? null,
      value: state.value,
      values: state.values,
      items: inputs.options ?? null,
      rich: hydrated && supportsBaseSelect(),
    }),
  }),
  attach: (api) => {
    const el = select(api);
    const onChange = () => {
      const detail = readSelection(el);
      api.setState({ value: detail.value, values: detail.values });
      api.emit('valueChange', detail);
    };
    // Options re-rendered, added late, or given their value after the first
    // render: re-apply the selection the core holds.
    const observer = new MutationObserver(() => sync(api));
    observer.observe(el, { childList: true, subtree: true, attributes: true, attributeFilter: ['value'] });
    el.addEventListener('change', onChange);
    sync(api);
    return () => {
      observer.disconnect();
      el.removeEventListener('change', onChange);
    };
  },
  inputsChanged: (api, prev) => {
    const inputs = api.inputs();
    const patch: Partial<SelectState> = {};
    if (inputs.value !== prev.value) patch.value = inputs.value ?? null;
    // By content: a front may hand a fresh array with the same values on every render.
    if (!sameValues(inputs.values, prev.values)) {
      patch.values = inputs.values ?? [];
      if (inputs.multiple) patch.value = patch.values[0] ?? null;
    }
    if (Object.keys(patch).length) api.setState(patch);
    // After the front has rendered the change.
    queueMicrotask(() => sync(api));
  },
});
