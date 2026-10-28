import { defineCore, type CoreApi } from '@mintplayer/ui-core/component';
import {
  connectMultiRange,
  constrainThumb,
  nearestThumbIndex,
  normaliseValues,
  pointerFraction,
  snapToStep,
  type MultiRangeOrientation,
  type MultiRangeView,
} from './multi-range';

/**
 * The multi-range slider's core (PRD #437 D10): what the generated Angular,
 * React, Vue and Lit components host. `multi-range.component.ts` is its
 * manifest and `templates/multi-range.view.vue` its markup.
 */

export interface MultiRangeInputs {
  min: number;
  max: number;
  /** Snap interval; 0 does not snap. */
  step: number;
  /** The smallest gap a user may leave between neighbouring thumbs. Written values are not held to it. */
  minDistance: number;
  orientation: MultiRangeOrientation;
  disabled: boolean;
  /** Each thumb submits its value under this name. */
  name?: string | null;
  /** Names the group; an `aria-label` on the component wins. */
  label?: string | null;
  /** Accessible name per thumb (default Minimum/Maximum value, or "Value K of N"). */
  thumbLabels?: string[] | null;
  /** Text per value: the tooltip, and `aria-valuetext`. */
  formatValue?: ((value: number) => string) | null;
  /** The thumbs, ascending. One thumb per entry; null is `[min, max]`. */
  value: number[] | null;
}

export interface MultiRangeState {
  value: number[];
  /** The thumb being moved, by pointer or key. */
  active: number | null;
}

export interface MultiRangeEvents {
  /** While a thumb moves (every pointer move and key step). */
  valueInput: number[];
  /** A move committed: pointer released, or a key step. */
  valueChange: number[];
}

export interface MultiRangeMethods {
  /** A copy of the current values. */
  getValues(): number[];
}

type Api = CoreApi<MultiRangeInputs, MultiRangeState, MultiRangeEvents>;

const same = (a: readonly number[], b: readonly number[]) => a.length === b.length && a.every((v, i) => v === b[i]);
const thumbsOf = (api: Api) => [...api.host.querySelectorAll<HTMLInputElement>('input.multi-range-thumb')];
const indexOf = (el: EventTarget | null) =>
  el instanceof HTMLInputElement && el.classList.contains('multi-range-thumb') ? Number(el.dataset['thumbIndex']) : null;

/** Put each thumb's live value where the state says: a dragged range input ignores its value attribute. */
function sync(api: Api) {
  const values = api.state().value;
  thumbsOf(api).forEach((input, i) => {
    if (i < values.length && Number(input.value) !== values[i]) input.value = String(values[i]);
  });
}

/** Move thumb `i` toward `candidate` within its neighbours. Reports `valueInput`; true when it moved. */
function move(api: Api, i: number, candidate: number): boolean {
  const { min, max, step, minDistance } = api.inputs();
  const values = [...api.state().value];
  const next = constrainThumb(values, i, snapToStep(candidate, min, max, step), min, max, minDistance);
  if (next === values[i]) {
    sync(api);
    return false;
  }
  values[i] = next;
  api.setState({ value: values, active: i });
  sync(api);
  api.emit('valueInput', [...values]);
  return true;
}

export const multiRangeCore = defineCore<MultiRangeInputs, MultiRangeState, { view: MultiRangeView }, MultiRangeEvents, undefined, undefined, MultiRangeMethods>({
  state: (inputs) => ({ value: normaliseValues(inputs.value, inputs.min, inputs.max), active: null }),
  view: ({ inputs, state, id, label }) => ({
    view: connectMultiRange({
      id,
      values: state.value,
      min: inputs.min,
      max: inputs.max,
      step: inputs.step,
      orientation: inputs.orientation,
      disabled: inputs.disabled,
      name: inputs.name ?? null,
      label: label ?? inputs.label ?? null,
      thumbLabels: inputs.thumbLabels ?? null,
      format: inputs.formatValue ?? null,
      active: state.active,
    }),
  }),
  attach: (api) => {
    const host = api.host;
    // A press on the bare track moves the nearest thumb there and keeps dragging it.
    let drag: { index: number; pointerId: number; rtl: boolean } | null = null;

    const valueAt = (event: PointerEvent, rtl: boolean) => {
      const track = host.querySelector<HTMLElement>('.multi-range-track');
      if (!track) return null;
      const { min, max, orientation } = api.inputs();
      const f = pointerFraction(track.getBoundingClientRect(), event.clientX, event.clientY, { vertical: orientation === 'vertical', rtl });
      return f === null ? null : min + f * (max - min);
    };

    const onInput = (event: Event) => {
      const i = indexOf(event.target);
      if (i === null) return;
      move(api, i, Number((event.target as HTMLInputElement).value));
    };
    const onChange = (event: Event) => {
      if (indexOf(event.target) === null) return;
      api.emit('valueChange', [...api.state().value]);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (api.inputs().disabled || event.button > 0) return;
      const i = indexOf(event.target);
      if (i !== null) {
        // The thumb's own drag is native; only raise it.
        api.setState({ active: i });
        return;
      }
      if (!(event.target as Element).closest?.('.multi-range-track')) return;
      const rtl = getComputedStyle(host).direction === 'rtl';
      const target = valueAt(event, rtl);
      if (target === null) return;
      const index = nearestThumbIndex(api.state().value, target);
      event.preventDefault();
      (event.target as Element).setPointerCapture?.(event.pointerId);
      drag = { index, pointerId: event.pointerId, rtl };
      move(api, index, target);
      thumbsOf(api)[index]?.focus({ preventScroll: true });
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.pointerId) return;
      const target = valueAt(event, drag.rtl);
      if (target !== null) move(api, drag.index, target);
    };
    const onPointerUp = (event: PointerEvent) => {
      if (drag && event.pointerId === drag.pointerId) {
        drag = null;
        api.emit('valueChange', [...api.state().value]);
      }
      if (api.state().active !== null) api.setState({ active: null });
    };
    const onFocusOut = () => {
      if (!drag && api.state().active !== null) api.setState({ active: null });
    };

    host.addEventListener('input', onInput);
    host.addEventListener('change', onChange);
    host.addEventListener('pointerdown', onPointerDown);
    host.addEventListener('pointermove', onPointerMove);
    host.addEventListener('pointerup', onPointerUp);
    host.addEventListener('pointercancel', onPointerUp);
    host.addEventListener('focusout', onFocusOut);
    // Thumbs moved before hydration are the user's.
    const typed = thumbsOf(api).map((input) => Number(input.value));
    if (typed.length === api.state().value.length && !same(typed, api.state().value)) {
      const { min, max } = api.inputs();
      const values = normaliseValues(typed, min, max);
      api.setState({ value: values });
      sync(api);
      api.emit('valueChange', [...values]);
    }
    return () => {
      host.removeEventListener('input', onInput);
      host.removeEventListener('change', onChange);
      host.removeEventListener('pointerdown', onPointerDown);
      host.removeEventListener('pointermove', onPointerMove);
      host.removeEventListener('pointerup', onPointerUp);
      host.removeEventListener('pointercancel', onPointerUp);
      host.removeEventListener('focusout', onFocusOut);
    };
  },
  inputsChanged: (api, prev) => {
    const inputs = api.inputs();
    if (inputs.value === prev.value && inputs.min === prev.min && inputs.max === prev.max) return;
    const source = inputs.value === prev.value ? api.state().value : inputs.value;
    const values = normaliseValues(source, inputs.min, inputs.max);
    if (same(values, api.state().value)) return;
    api.setState({ value: values });
    sync(api);
    // New bounds that move a thumb change the value the consumer holds.
    if (inputs.value === prev.value) api.emit('valueChange', [...values]);
  },
  methods: {
    getValues: (api) => [...api.state().value],
  },
});
