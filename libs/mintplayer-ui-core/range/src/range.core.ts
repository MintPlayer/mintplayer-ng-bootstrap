import { defineCore, type CoreBag } from '@mintplayer/ui-core/component';

/**
 * Bootstrap's range (#458 M5): a native `<input type="range" class="form-range">`,
 * which owns its slider role, value and keyboard (arrows, Page Up/Down,
 * Home/End) with no ARIA to keep in sync.
 *
 *   <span class="range-host"><input type=range class=form-range min max step aria-label></span>
 *
 * `value` is two-way. No-JS tier 2: the slider works natively (and submits
 * with a `name`); only the two-way binding waits for hydration.
 */
export interface RangeInputs {
  value: number;
  min: number;
  max: number;
  step: number;
  disabled: boolean;
  /** Names the slider when no `<label for>` does. A consumer `aria-label` wins. */
  label: string | null;
}

export interface RangeView {
  readonly root: CoreBag;
  readonly input: CoreBag;
  /** The live value, set as a property (the `value` attribute is only the default). */
  readonly value: string;
}

export const RANGE_INPUT_ATTR = 'data-range-input';

export function connectRange(inputs: RangeInputs, value: number, consumerLabel: string | null = null): RangeView {
  return {
    root: { class: 'range-host' },
    input: {
      type: 'range',
      class: 'form-range',
      min: String(inputs.min),
      max: String(inputs.max),
      step: String(inputs.step),
      value: String(value),
      disabled: inputs.disabled ? '' : null,
      'aria-label': consumerLabel ?? inputs.label ?? null,
      [RANGE_INPUT_ATTR]: '',
    },
    value: String(value),
  };
}

export const rangeCore = defineCore<RangeInputs, { value: number }, { view: RangeView }, { valueChange: number }>({
  state: (inputs) => ({ value: Number(inputs.value) || 0 }),
  view: ({ inputs, state, label }) => ({ view: connectRange(inputs, state.value, label) }),
  attach: (api) => {
    const onInput = (event: Event) => {
      const input = event.target as HTMLInputElement | null;
      if (!input?.hasAttribute?.(RANGE_INPUT_ATTR) || !api.host.contains(input)) return;
      const value = parseFloat(input.value);
      if (Number.isNaN(value) || value === api.state().value) return;
      api.setState({ value });
      api.emit('valueChange', value);
    };
    api.host.addEventListener('input', onInput);
    return () => api.host.removeEventListener('input', onInput);
  },
  inputsChanged: (api, prev) => {
    const value = Number(api.inputs().value) || 0;
    if (value === (Number(prev.value) || 0) || value === api.state().value) return;
    api.setState({ value });
  },
});
