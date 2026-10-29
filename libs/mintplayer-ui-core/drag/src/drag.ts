export interface Point {
  x: number;
  y: number;
}

export interface GestureOptions {
  /** Distance a mouse/pen pointer must travel before a press becomes a drag, px. Default 4. */
  threshold?: number;
  /**
   * Touch only: how long the finger must rest before a press becomes a drag,
   * ms. Movement past the threshold before that is a scroll, not a drag.
   * Default 600 (the scheduler's measured hold). 0 = drag on threshold, like a mouse.
   */
  holdMs?: number;
}

export type GesturePhase = 'idle' | 'pressed' | 'dragging' | 'scrolling';

/**
 * Turns pointer down/move/up into "is this a drag yet". Pure (the caller
 * passes the clock), so the threshold and touch-hold rules are one copy for
 * every draggable component instead of one per element. The front wires the
 * DOM: `touch-action: none` on the handle, pointer capture, and a keyboard
 * equivalent for every drag (CLAUDE.md accessibility rules), typically
 * {@link reorderTarget}.
 */
export class DragGesture {
  #phase: GesturePhase = 'idle';
  #origin: Point = { x: 0, y: 0 };
  #downAt = 0;
  #touch = false;
  readonly #threshold: number;
  readonly #holdMs: number;

  constructor(options: GestureOptions = {}) {
    this.#threshold = options.threshold ?? 4;
    this.#holdMs = options.holdMs ?? 600;
  }

  get phase(): GesturePhase {
    return this.#phase;
  }

  /** Pointer offset from where the press began. */
  delta(point: Point): Point {
    return { x: point.x - this.#origin.x, y: point.y - this.#origin.y };
  }

  down(point: Point, pointerType: string, now: number): void {
    this.#phase = 'pressed';
    this.#origin = point;
    this.#downAt = now;
    this.#touch = pointerType === 'touch';
  }

  /** Returns the phase after this move; `dragging` once the press qualifies. */
  move(point: Point, now: number): GesturePhase {
    if (this.#phase !== 'pressed') return this.#phase;
    const { x, y } = this.delta(point);
    const moved = Math.hypot(x, y) >= this.#threshold;
    const held = now - this.#downAt >= this.#holdMs;
    if (!this.#touch || this.#holdMs === 0) {
      if (moved) this.#phase = 'dragging';
    } else if (held) {
      this.#phase = 'dragging';
    } else if (moved) {
      this.#phase = 'scrolling';
    }
    return this.#phase;
  }

  /** A touch press that rested long enough becomes a drag without moving (call from a hold timer). */
  hold(now: number): GesturePhase {
    if (this.#phase === 'pressed' && this.#touch && now - this.#downAt >= this.#holdMs) this.#phase = 'dragging';
    return this.#phase;
  }

  /** Ends the gesture. Returns whether it was a drag (the front then suppresses the click). */
  up(): boolean {
    const dragged = this.#phase === 'dragging';
    this.#phase = 'idle';
    return dragged;
  }

  cancel(): void {
    this.#phase = 'idle';
  }
}

/** A copy of `items` with the element at `from` moved to `to`. */
export function moveItem<T>(items: ReadonlyArray<T>, from: number, to: number): T[] {
  if (from < 0 || from >= items.length) return [...items];
  const target = Math.max(0, Math.min(items.length - 1, to));
  const without = items.filter((_, i) => i !== from);
  return [...without.slice(0, target), items[from], ...without.slice(target)];
}

/**
 * The keyboard equivalent of drag-to-reorder: Alt+Arrow moves the item one
 * place, Alt+Home/End to the ends. Returns the new index, or `null` when the
 * key is not a reorder key or the item cannot move. `orientation` picks the
 * arrow pair; `rtl` flips the horizontal one.
 */
export function reorderTarget(
  key: string,
  modifiers: { altKey: boolean },
  from: number,
  count: number,
  orientation: 'vertical' | 'horizontal' = 'vertical',
  rtl = false,
): number | null {
  if (!modifiers.altKey || count < 2) return null;
  const back = orientation === 'vertical' ? 'ArrowUp' : rtl ? 'ArrowRight' : 'ArrowLeft';
  const forward = orientation === 'vertical' ? 'ArrowDown' : rtl ? 'ArrowLeft' : 'ArrowRight';
  const to =
    key === back ? from - 1 : key === forward ? from + 1 : key === 'Home' ? 0 : key === 'End' ? count - 1 : null;
  if (to === null || to < 0 || to >= count || to === from) return null;
  return to;
}
