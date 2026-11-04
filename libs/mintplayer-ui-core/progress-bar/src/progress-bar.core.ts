import { defineCore, type CoreBag } from '@mintplayer/ui-core/component';
import { isThemeColor, type ThemeColor } from '@mintplayer/ui-core/color';

/**
 * Bootstrap's progress (#458 M5): a track and one or more bars.
 *
 *   <div class="progress-host">
 *     <div class="progress" style="--bs-progress-height: <height>px">
 *       <div class="progress-bar text-bg-<color> [striped] [animated]" role=progressbar
 *            aria-valuenow aria-valuemin aria-valuemax aria-label [aria-valuetext]
 *            data-progress=<rounded pct>>…label…</div>
 *       (or, indeterminate: one bar with role=progressbar and no aria-valuenow)
 *     </div>
 *   </div>
 *
 * The width comes from `data-progress` (the percentage rounded to a whole
 * number) through 101 generated sheet rules: no inline style, so a strict CSP
 * `style-src` holds. Each bar
 * has its own role and name, so stacked bars each read on their own. A bar's
 * host is taken out of the layout so the bar is the track's flex item.
 * No-JS: static markup, fully functional.
 */

// ---------------------------------------------------------------- progress

export interface ProgressInputs {
  /** Track height in pixels; null keeps Bootstrap's. */
  height: number | null;
  /** Show an animated bar of unknown progress instead of the content. */
  indeterminate: boolean;
  /** Names the indeterminate bar. Override for localisation. */
  label: string;
}

export interface ProgressView {
  readonly root: CoreBag;
  readonly track: CoreBag;
  readonly trackStyle: Record<string, string>;
  /** The indeterminate bar; null when the bars are the content. */
  readonly indeterminate: CoreBag | null;
}

export function connectProgress({ height, indeterminate, label }: ProgressInputs): ProgressView {
  return {
    root: { class: 'progress-host' },
    track: { class: 'progress' },
    trackStyle: height != null ? { '--bs-progress-height': `${height}px` } : {},
    indeterminate: indeterminate ? { class: 'progress-bar progress-bar-indeterminate text-bg-primary', role: 'progressbar', 'aria-label': label } : null,
  };
}

export const progressCore = defineCore<ProgressInputs, object, { view: ProgressView }>({
  view: ({ inputs }) => ({ view: connectProgress(inputs) }),
});

// ---------------------------------------------------------------- progress bar

export interface ProgressBarInputs {
  minimum: number;
  maximum: number;
  value: number;
  color: ThemeColor;
  striped: boolean;
  /** Animates the stripes (implies striped); stilled under reduced motion. */
  animated: boolean;
  /** The bar's accessible name. Override for localisation; a consumer `aria-label` wins. */
  label: string;
  /** A human reading of the value ('3 of 5 steps') when the raw number misleads. */
  valueText: string | null;
}

export interface ProgressBarView {
  readonly bar: CoreBag;
}

/** The attribute carrying a bar's rounded percentage; the sheet maps each value to a width. */
export const PROGRESS_ATTR = 'data-progress';

/** Where `value` sits between `minimum` and `maximum`, as a percentage clamped to 0–100. */
export function progressPercentage(value: number, minimum: number, maximum: number): number {
  if (!(maximum > minimum)) return 0;
  return Math.min(100, Math.max(0, ((value - minimum) / (maximum - minimum)) * 100));
}

export function connectProgressBar(inputs: ProgressBarInputs, consumerLabel: string | null = null): ProgressBarView {
  const { minimum, maximum, value, color, striped, animated, label, valueText } = inputs;
  return {
    bar: {
      class: [
        'progress-bar',
        `text-bg-${isThemeColor(color) ? color : 'primary'}`,
        striped || animated ? 'progress-bar-striped' : null,
        animated ? 'progress-bar-animated' : null,
      ]
        .filter(Boolean)
        .join(' '),
      role: 'progressbar',
      'aria-valuenow': String(value),
      'aria-valuemin': String(minimum),
      'aria-valuemax': String(maximum),
      'aria-label': consumerLabel ?? label,
      'aria-valuetext': valueText,
      [PROGRESS_ATTR]: String(Math.round(progressPercentage(value, minimum, maximum))),
    },
  };
}

export const progressBarCore = defineCore<ProgressBarInputs, object, { view: ProgressBarView }>({
  host: () => ({ class: 'progress-bar-host' }),
  view: ({ inputs, label }) => ({ view: connectProgressBar(inputs, label) }),
});
