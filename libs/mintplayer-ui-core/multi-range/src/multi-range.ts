/**
 * The multi-thumb range slider, framework-neutral (PRD #437). Every thumb is a
 * native `<input type="range">`, stacked over one track: the browser owns the
 * slider role, `aria-valuenow`, the keyboard (arrows, Page Up/Down, Home/End,
 * RTL) and form submission. With JavaScript off the thumbs drag, step and
 * submit under `name`; the core adds the neighbour constraint, the fill
 * between thumbs and a press on the bare track.
 */

export type MultiRangeOrientation = 'horizontal' | 'vertical';

export const MULTI_RANGE_SCOPE = 'multi-range';

export type MultiRangeBag = Record<string, string | number | boolean | null>;
/** Geometry custom properties (PRD D7): a fraction of the track, 0..1. */
export type MultiRangeStyle = Record<string, string>;

/** Clamp to [min, max]. */
export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** The nearest step from `min`, inside [min, max]. A step of 0 or less does not snap. */
export function snapToStep(v: number, min: number, max: number, step: number): number {
  if (!(step > 0)) return clamp(v, min, max);
  const snapped = min + Math.round((v - min) / step) * step;
  // Rounding the step arithmetic keeps 0.1 + 0.2 from rendering as 0.30000000000000004.
  const decimals = (String(step).split('.')[1] ?? '').length;
  return clamp(Number(snapped.toFixed(decimals)), min, max);
}

/** A consumer's values, clamped to the bounds and sorted; `[min, max]` when empty. */
export function normaliseValues(values: readonly number[] | null | undefined, min: number, max: number): number[] {
  const finite = (values ?? []).map(Number).filter((v) => Number.isFinite(v));
  if (!finite.length) return [min, max];
  return finite.map((v) => clamp(v, min, max)).sort((a, b) => a - b);
}

/** Keep thumb `i` at least `minDistance` from its neighbours: thumbs never pass each other. */
export function constrainThumb(values: readonly number[], i: number, candidate: number, min: number, max: number, minDistance: number): number {
  const lower = i > 0 ? values[i - 1] + minDistance : min;
  const upper = i < values.length - 1 ? values[i + 1] - minDistance : max;
  return Math.min(Math.max(candidate, lower), upper);
}

/** Where `value` sits on the track, 0..1. */
export function fraction(value: number, min: number, max: number): number {
  const range = max - min;
  return range > 0 ? clamp((value - min) / range, 0, 1) : 0;
}

/** The parts of a track's bounding rect the pointer mapping reads. */
export interface TrackRect {
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

/**
 * Where a pointer sits along the track, 0..1 from its start (bottom when
 * vertical, the inline-start edge otherwise); past either end clamps to it.
 * Null when the track has no length, which would otherwise yield NaN.
 */
export function pointerFraction(rect: TrackRect, clientX: number, clientY: number, axis: { vertical: boolean; rtl: boolean }): number | null {
  const length = axis.vertical ? rect.height : rect.width;
  if (!(length > 0)) return null;
  const offset = axis.vertical ? rect.bottom - clientY : axis.rtl ? rect.right - clientX : clientX - rect.left;
  return clamp(offset / length, 0, 1);
}

/**
 * The thumb closest to `target`. Ties (thumbs stacked on one value) break by
 * side: above the stack picks its highest thumb, below or on it the lowest, so
 * the picked thumb is never blocked by its neighbour from reaching the target.
 */
export function nearestThumbIndex(values: readonly number[], target: number): number {
  return values.reduce((best, v, i) => {
    const dBest = Math.abs(values[best] - target);
    const dCur = Math.abs(v - target);
    if (dCur < dBest) return i;
    if (dCur > dBest) return best;
    return target > v ? i : best;
  }, 0);
}

/** Per-thumb accessible names: Minimum/Maximum for a pair, "Value K of N" beyond. */
export function thumbName(index: number, count: number, labels: readonly string[] | null | undefined): string {
  const custom = labels?.[index];
  if (custom) return custom;
  if (count === 2) return index === 0 ? 'Minimum value' : 'Maximum value';
  return `Value ${index + 1} of ${count}`;
}

export interface MultiRangeOptions {
  readonly id: string;
  readonly values: readonly number[];
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly orientation: MultiRangeOrientation;
  readonly disabled: boolean;
  readonly name: string | null;
  /** The group's accessible name. */
  readonly label: string | null;
  readonly thumbLabels: readonly string[] | null;
  /** Text for each value, read out as `aria-valuetext` and shown in the tooltip. */
  readonly format: ((value: number) => string) | null;
  /** The thumb the user is moving: drawn on top, its tooltip shown. */
  readonly active: number | null;
}

export interface MultiRangeThumbView {
  key: string;
  /** The `display: contents` wrapper that keeps a thumb's input and tooltip siblings. */
  slot: MultiRangeBag;
  input: MultiRangeBag;
  tooltip: MultiRangeBag;
  /** Positions the tooltip over the thumb. */
  position: MultiRangeStyle;
  text: string;
}

export interface MultiRangeFillView {
  key: string;
  bag: MultiRangeBag;
  geometry: MultiRangeStyle;
}

export interface MultiRangeView {
  root: MultiRangeBag;
  track: MultiRangeBag;
  fills: MultiRangeFillView[];
  thumbs: MultiRangeThumbView[];
}

const scoped = (bag: MultiRangeBag): MultiRangeBag => ({ ...bag, 'data-mps': MULTI_RANGE_SCOPE });
const pos = (f: number) => String(Number(f.toFixed(6)));

function formatted(format: MultiRangeOptions['format'], value: number): string | null {
  if (!format) return null;
  try {
    return format(value);
  } catch {
    return String(value);
  }
}

export function connectMultiRange(options: MultiRangeOptions): MultiRangeView {
  const { values, min, max, orientation, disabled } = options;
  const vertical = orientation === 'vertical';
  const at = (v: number) => fraction(v, min, max);
  const mid = (min + max) / 2;

  const thumbs = values.map((value, i): MultiRangeThumbView => {
    const text = formatted(options.format, value);
    // A thumb stacked on its upper neighbour in the upper half could not be
    // grabbed under it; raise it, as well as the thumb being moved.
    const raised = options.active === i || (i < values.length - 1 && values[i + 1] === value && value > mid);
    return {
      key: String(i),
      slot: scoped({ class: 'multi-range-slot' }),
      input: scoped({
        class: ['multi-range-thumb', raised ? 'multi-range-thumb-raised' : null].filter(Boolean).join(' '),
        type: 'range',
        id: `${options.id}-thumb-${i}`,
        name: options.name,
        min,
        max,
        step: options.step > 0 ? options.step : 'any',
        value,
        disabled,
        'aria-label': thumbName(i, values.length, options.thumbLabels),
        'aria-valuetext': text,
        'aria-orientation': vertical ? 'vertical' : null,
        'data-thumb-index': i,
      }),
      tooltip: scoped({
        class: ['multi-range-tooltip', options.active === i ? 'multi-range-tooltip-shown' : null].filter(Boolean).join(' '),
        'aria-hidden': 'true',
      }),
      position: { '--mp-multi-range-at': pos(at(value)) },
      text: text ?? String(value),
    };
  });

  const fills = values.slice(0, -1).map((value, i): MultiRangeFillView => ({
    key: String(i),
    bag: scoped({ class: 'multi-range-fill' }),
    geometry: { '--mp-multi-range-from': pos(at(value)), '--mp-multi-range-to': pos(at(values[i + 1])) },
  }));

  return {
    root: scoped({
      class: ['mp-multi-range', vertical ? 'mp-multi-range-vertical' : null, disabled ? 'mp-multi-range-disabled' : null].filter(Boolean).join(' '),
      role: 'group',
      'aria-label': options.label,
      'aria-disabled': disabled ? 'true' : null,
    }),
    track: scoped({ class: 'multi-range-track' }),
    fills,
    thumbs,
  };
}
