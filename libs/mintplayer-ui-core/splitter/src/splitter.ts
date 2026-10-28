import type { CoreBag } from '@mintplayer/ui-core/component';
import { defineContext } from '@mintplayer/ui-core/component';
import { hydratedAttr } from '@mintplayer/ui-core/store';

/**
 * The splitter (#437): panels laid out along one axis, with a divider between
 * every two that a pointer drag or the keyboard moves.
 *
 * The panels are the consumer's splitter panels. Each one renders its own
 * divider in front of its content, so no node is ever inserted between
 * framework-owned children; the first panel's divider is hidden by the sheet.
 * A panel's root is `display: contents`, which makes its divider and its pane
 * flex items of the splitter itself.
 *
 * Sizes are pixels and live in the core's engine, not in state: a drag writes
 * every frame, straight onto the panes' inline size. Before the first
 * measurement every pane has `flex: 1 1 0`, so the server render already
 * splits the space evenly.
 */
export const SPLITTER_SCOPE = 'splitter';

export type SplitterBag = CoreBag;
export type SplitterOrientation = 'horizontal' | 'vertical';
export type SplitterResizeKey = 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown' | 'Home' | 'End';

export interface SplitterResizeEventDetail {
  sizes: number[];
  orientation: SplitterOrientation;
}

/** Accessible names. `${before}` and `${after}` are the 1-based numbers of the panels a divider separates. */
export interface SplitterLabels {
  divider: string;
}

export const SPLITTER_LABELS: SplitterLabels = {
  divider: 'Resize between panel ${before} and panel ${after}',
};

export const splitterLabel = (template: string, vars: Record<string, number>): string =>
  template.replace(/\$\{(\w+)\}/g, (all, name: string) => (name in vars ? String(vars[name]) : all));

export const parseSplitterOrientation = (value: unknown): SplitterOrientation => (value === 'vertical' ? 'vertical' : 'horizontal');

/** What a splitter hands its panels. */
export interface SplitterPanelsContext {
  readonly orientation: SplitterOrientation;
}

export const SPLITTER_PANELS = defineContext<SplitterPanelsContext>('splitter-panels', { orientation: 'horizontal' });

const scoped = (bag: SplitterBag): SplitterBag => ({ ...bag, 'data-mps': SPLITTER_SCOPE });

export interface SplitterOptions {
  readonly orientation: SplitterOrientation;
  readonly touchMode: boolean;
  /** A divider drag is in flight. */
  readonly resizing: boolean;
  readonly hydrated: boolean;
}

export interface SplitterView {
  readonly root: SplitterBag;
}

export function connectSplitter(options: SplitterOptions): SplitterView {
  const classes = ['splitter', options.orientation, options.touchMode ? 'touch-mode' : '', options.resizing ? 'resizing' : ''];
  return {
    root: scoped({ class: classes.filter(Boolean).join(' '), ...hydratedAttr(options.hydrated) }),
  };
}

export interface SplitterPanelOptions {
  /** Deterministic: the pane's id, which the divider after it names in `aria-controls`. */
  readonly id: string;
  readonly orientation: SplitterOrientation;
  readonly hydrated: boolean;
}

export interface SplitterPanelView {
  readonly root: SplitterBag;
  readonly divider: SplitterBag;
  readonly pane: SplitterBag;
}

/** The pane id a panel with this core id renders. */
export const splitterPaneId = (id: string): string => `${id}-pane`;

/**
 * One panel. Its divider is a separator across the splitter's axis. It takes
 * focus only once live: with JS off it cannot move, so it stays a plain
 * (static) separator. The value attributes, `aria-controls` and the name are
 * written by the splitter once it has measured, since they depend on the
 * panel's neighbours.
 */
export function connectSplitterPanel(options: SplitterPanelOptions): SplitterPanelView {
  return {
    root: scoped({ class: 'splitter-panel' }),
    divider: scoped({
      class: 'splitter-divider',
      role: 'separator',
      'aria-orientation': options.orientation === 'horizontal' ? 'vertical' : 'horizontal',
      tabindex: options.hydrated ? 0 : null,
    }),
    pane: scoped({ class: 'splitter-pane', id: splitterPaneId(options.id) }),
  };
}

/** The pixel sizes after dragging the divider between `index` and `index + 1` by `delta`, each side kept at `min` or more. */
export function dragSizes(sizes: readonly number[], index: number, delta: number, min: number): number[] {
  const before = sizes[index];
  const after = sizes[index + 1];
  if (before === undefined || after === undefined) return [...sizes];
  let nextBefore = before + delta;
  let nextAfter = after - delta;
  if (nextBefore < min) {
    nextAfter -= min - nextBefore;
    nextBefore = min;
  }
  if (nextAfter < min) {
    nextBefore -= min - nextAfter;
    nextAfter = min;
  }
  const next = [...sizes];
  next[index] = Math.max(nextBefore, min);
  next[index + 1] = Math.max(nextAfter, min);
  return next;
}

/**
 * The pixel sizes after a key on the divider between `index` and `index + 1`:
 * the arrows along the axis move it by 10% of `total` (1% when `fine`), Home and
 * End push it to either limit. Null when the key does nothing (an off-axis
 * arrow, or a divider already at the limit).
 */
export function keySizes(
  sizes: readonly number[],
  index: number,
  key: string,
  options: { readonly orientation: SplitterOrientation; readonly total: number; readonly min: number; readonly fine: boolean },
): number[] | null {
  const before = sizes[index];
  const after = sizes[index + 1];
  if (before === undefined || after === undefined || options.total <= 0) return null;
  const { min } = options;
  const pair = before + after;
  const horizontal = options.orientation === 'horizontal';
  const step = ((options.fine ? 1 : 10) / 100) * options.total;
  const delta: Record<string, number> = horizontal ? { ArrowRight: step, ArrowLeft: -step } : { ArrowDown: step, ArrowUp: -step };
  const nextBefore =
    key === 'Home' ? min : key === 'End' ? pair - min : key in delta ? Math.min(Math.max(before + delta[key], min), pair - min) : null;
  if (nextBefore === null || nextBefore === before) return null;
  const next = [...sizes];
  next[index] = nextBefore;
  next[index + 1] = pair - nextBefore;
  return next;
}

/**
 * Scale `sizes` proportionally to fill `available` (the splitter minus its
 * dividers). Null when there is nothing to do: no ratio to keep, a non-finite
 * space, or a change below 1px, which applying the sizes can itself cause, so
 * rescaling on it would chase the splitter's own writes. A negative space is 0.
 */
export function rescaleSizes(sizes: readonly number[], available: number): number[] | null {
  if (sizes.length === 0 || !Number.isFinite(available)) return null;
  const total = sizes.reduce((sum, size) => sum + size, 0);
  if (!(total > 0)) return null;
  const target = Math.max(0, available);
  if (Math.abs(target - total) < 1) return null;
  return sizes.map((size) => (size * target) / total);
}

/** The divider's value attributes: percent of `total`, the pair reading as text. */
export function dividerValues(sizes: readonly number[], index: number, total: number, min: number): SplitterBag | null {
  const before = sizes[index];
  const after = sizes[index + 1];
  if (before === undefined || after === undefined || total <= 0) return null;
  const pct = (px: number) => Math.round((px / total) * 100);
  return {
    'aria-valuenow': pct(before),
    'aria-valuemin': pct(min),
    'aria-valuemax': pct(before + after - min),
    'aria-valuetext': `${pct(before)}% / ${pct(after)}%`,
  };
}
