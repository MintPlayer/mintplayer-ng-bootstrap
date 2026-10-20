import { PointerArbiterCallbacks, PointerArbiterConfig } from './models';

/**
 * Pointer-gesture arbiter: coordinates in, drag/tap semantics out.
 *
 * Never touches a DOM event — callers feed it (x, y) pairs from whatever input
 * they listen to (touch, pointer, synthetic) and honour its boolean verdicts:
 * `pointerMove`/`pointerUp` return `true` when the caller should
 * `preventDefault()` (the gesture has locked onto this widget's axis and
 * native scroll / pull-to-refresh must not run).
 *
 * The two constants encode hard-won behavior — see
 * docs/prd/vertical-swipe-firefox-android.md:
 * - 3px lock threshold with primary-dominates-perpendicular arbitration, so
 *   preventDefault() can fire before Firefox Android's APZ claims the gesture,
 *   while a 4px off-axis jitter still leaves native page scroll alone.
 * - 20ms start delay so a tap settles without being recognised as a drag; a
 *   release inside the window is a tap and produces no drag events at all.
 */
export class PointerArbiter {
  private static readonly DEFAULT_THRESHOLD_PX = 3;
  private static readonly DEFAULT_START_DELAY_MS = 20;

  private readonly thresholdPx: number;
  private readonly startDelayMs: number;
  private orientation: PointerArbiterConfig['orientation'];

  private origin: { x: number; y: number } | null = null;
  private locked = false;
  private dragging = false;
  private lastDeltaPx = 0;
  private startTimer: ReturnType<typeof setTimeout> | null = null;
  private destroyed = false;

  constructor(
    config: PointerArbiterConfig,
    private readonly callbacks: PointerArbiterCallbacks = {},
  ) {
    this.orientation = config.orientation;
    this.thresholdPx = config.swipeThresholdPx ?? PointerArbiter.DEFAULT_THRESHOLD_PX;
    this.startDelayMs = config.startDelayMs ?? PointerArbiter.DEFAULT_START_DELAY_MS;
  }

  setOrientation(orientation: PointerArbiterConfig['orientation']): void {
    this.orientation = orientation;
  }

  /** `touch-action` the consumer should set on the gesture surface. */
  get touchAction(): 'pan-x' | 'pan-y' {
    return this.orientation === 'horizontal' ? 'pan-y' : 'pan-x';
  }

  pointerDown(x: number, y: number): void {
    if (this.destroyed) return;
    this.reset();
    this.origin = { x, y };
    this.startTimer = setTimeout(() => {
      this.startTimer = null;
      if (this.destroyed || !this.origin) return;
      this.dragging = true;
      this.callbacks.onDragStart?.();
      this.callbacks.onDragMove?.(this.lastDeltaPx);
    }, this.startDelayMs);
  }

  /** Returns true when the caller should preventDefault() on this move event. */
  pointerMove(x: number, y: number): boolean {
    if (!this.origin) return false;
    const dx = Math.abs(x - this.origin.x);
    const dy = Math.abs(y - this.origin.y);
    const primary = this.orientation === 'horizontal' ? dx : dy;
    const perpendicular = this.orientation === 'horizontal' ? dy : dx;
    if (!this.locked && primary > this.thresholdPx && primary >= perpendicular) {
      this.locked = true;
    }
    this.lastDeltaPx =
      this.orientation === 'horizontal' ? x - this.origin.x : y - this.origin.y;
    if (this.dragging) {
      this.callbacks.onDragMove?.(this.lastDeltaPx);
    }
    return this.locked;
  }

  /** Returns true when the caller should preventDefault() on the end event. */
  pointerUp(): boolean {
    const prevent = this.locked;
    if (this.startTimer !== null) {
      // Released inside the start window: a tap, not a drag.
      this.reset();
      this.callbacks.onTap?.();
      return false;
    }
    if (this.dragging) {
      const delta = this.lastDeltaPx;
      this.reset();
      this.callbacks.onDragEnd?.(delta);
    } else {
      this.reset();
    }
    return prevent;
  }

  /** Abandon the gesture without emitting anything (e.g. pointercancel). */
  abort(): void {
    this.reset();
  }

  destroy(): void {
    this.destroyed = true;
    this.reset();
  }

  private reset(): void {
    if (this.startTimer !== null) {
      clearTimeout(this.startTimer);
      this.startTimer = null;
    }
    this.origin = null;
    this.locked = false;
    this.dragging = false;
    this.lastDeltaPx = 0;
  }
}
