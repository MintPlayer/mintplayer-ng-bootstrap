import {
  IndexMachineCallbacks,
  IndexMachineConfig,
  IndexMachineHost,
  SwipeIntent,
  TransitionHandle,
} from './models';

/**
 * Slide-index state machine over a plain `count`, with transitions.
 *
 * Positions leave the machine only as a unit-free `offsetRatio` in slide units
 * (see {@link IndexMachineHost}), so the host is free to realise motion as a
 * transform, a scroll offset, or a timed crossfade. Wrap-around/clamping lives
 * HERE, so buttons, keyboard, and drag release all obey one rule. During a
 * wrapping relative move the visual target transiently leaves [0, count-1]
 * (-1 or `count` — the host's wrap cells); the committed index is always
 * wrapped back into range.
 *
 * Interruption: starting any navigation (or a new drag) finishes an in-flight
 * transition first — `finish()` jumps it to its end state and commits.
 */
export class IndexMachine {
  private index = 0;
  private count: number;
  private wrap: boolean;
  private durationMs: number;
  private minimumOffsetPx: number;
  private prefersReducedMotion?: () => boolean;

  private pending: TransitionHandle | null = null;
  private animating = false;
  private dragRatio = 0;
  private dragging = false;

  constructor(
    private readonly host: IndexMachineHost,
    private readonly callbacks: IndexMachineCallbacks = {},
    config: IndexMachineConfig,
  ) {
    this.count = config.count;
    this.wrap = config.wrap ?? true;
    this.durationMs = config.durationMs ?? 500;
    this.minimumOffsetPx = config.minimumOffsetPx ?? 50;
    this.prefersReducedMotion = config.prefersReducedMotion;
  }

  // ---- config / state -------------------------------------------------------

  setConfig(config: Partial<IndexMachineConfig>): void {
    if (config.count !== undefined) {
      this.count = config.count;
      if (this.index >= this.count) {
        // The deck shrank under the current index: land on the new last slide.
        this.commit(Math.max(0, this.count - 1));
        this.host.applyOffsetRatio(this.index);
      }
    }
    if (config.wrap !== undefined) this.wrap = config.wrap;
    if (config.durationMs !== undefined) this.durationMs = config.durationMs;
    if (config.minimumOffsetPx !== undefined) this.minimumOffsetPx = config.minimumOffsetPx;
    if (config.prefersReducedMotion !== undefined) this.prefersReducedMotion = config.prefersReducedMotion;
  }

  getIndex(): number {
    return this.index;
  }

  get isAnimating(): boolean {
    return this.animating;
  }

  // ---- navigation -----------------------------------------------------------

  next(): void {
    this.relative(1);
  }

  previous(): void {
    this.relative(-1);
  }

  /**
   * Navigate to an absolute index. Out-of-range targets are a no-op (never
   * wrapped — wrapping is a property of *relative* movement). `animate: false`
   * jumps instantly with no events beyond `onIndexChange`.
   */
  goto(target: number, opts: { animate?: boolean } = {}): void {
    if (target < 0 || target >= this.count) return;
    // Settle any in-flight transition BEFORE reading the current index — the
    // finished transition commits, and the new move starts from that reality.
    this.interrupt();
    if (opts.animate === false) {
      this.endDragState();
      this.commit(target);
      this.host.applyOffsetRatio(this.index);
      return;
    }
    if (target === this.index && !this.dragging) return;
    this.transitionTo(target, target);
  }

  intent(intent: SwipeIntent): void {
    switch (intent) {
      case 'previous': return this.previous();
      case 'next': return this.next();
      case 'first': return this.goto(0);
      case 'last': return this.goto(Math.max(0, this.count - 1));
    }
  }

  private relative(delta: -1 | 1): void {
    // Settle any in-flight transition first, so the target is computed from
    // the committed index rather than a stale pre-transition one.
    this.interrupt();
    const raw = this.index + delta;
    const resolved = this.resolve(raw);
    if (resolved === null) return;
    if (!this.wrap && resolved === this.index && !this.dragging) return;
    // The visual target keeps the raw value so a wrap animates through the
    // host's wrap cell (-1 or count) instead of rewinding across the deck.
    this.transitionTo(raw, resolved);
  }

  // ---- drag -----------------------------------------------------------------

  /** A drag began: interrupt any in-flight transition so the finger owns the track. */
  beginDrag(): void {
    this.interrupt();
    this.dragging = true;
    this.dragRatio = 0;
  }

  /** Live drag update. Content follows the pointer: positive delta drags backwards. */
  dragBy(deltaPx: number, extentPx: number): void {
    if (!this.dragging || extentPx <= 0) return;
    let ratio = deltaPx / extentPx;
    if (!this.wrap) {
      // Rubber-band nothing: hard-stop the drag at the deck's edges.
      const over = this.index - ratio;
      if (over < 0) ratio = this.index;
      if (over > this.count - 1) ratio = this.index - (this.count - 1);
    }
    this.dragRatio = ratio;
    this.host.applyOffsetRatio(this.index - ratio);
  }

  /** Drag release: commit when past the threshold, snap back otherwise. */
  endDrag(deltaPx: number, extentPx: number): void {
    if (!this.dragging) return;
    const exceeded = Math.abs(deltaPx) >= this.minimumOffsetPx;
    const raw = exceeded ? this.index + (deltaPx < 0 ? 1 : -1) : this.index;
    const resolved = this.resolve(raw);
    if (resolved === null || (!this.wrap && resolved === this.index && raw !== this.index)) {
      // Edge with wrap off: snap back to the current slide.
      this.transitionTo(this.index, this.index);
      return;
    }
    this.transitionTo(raw, resolved);
  }

  // ---- internals ------------------------------------------------------------

  /** Wrap (or clamp) a raw target into the committed range; null when empty. */
  private resolve(raw: number): number | null {
    if (this.count <= 0) return null;
    if (raw >= 0 && raw < this.count) return raw;
    if (!this.wrap) return Math.min(Math.max(raw, 0), this.count - 1);
    return ((raw % this.count) + this.count) % this.count;
  }

  /** Finish (commit) an in-flight transition so a new owner can take the track. */
  interrupt(): void {
    this.pending?.finish();
  }

  private endDragState(): void {
    this.dragging = false;
    this.dragRatio = 0;
  }

  private transitionTo(visualTarget: number, resolved: number): void {
    this.interrupt();
    const fromRatio = this.index - this.dragRatio;
    this.endDragState();

    const duration = this.prefersReducedMotion?.() ? 0 : this.durationMs;
    this.callbacks.onAnimationStart?.();

    const done = () => {
      this.animating = false;
      this.pending = null;
      this.commit(resolved);
      this.host.applyOffsetRatio(this.index);
      this.callbacks.onAnimationEnd?.();
    };

    if (duration <= 0 || fromRatio === visualTarget) {
      done();
      return;
    }
    this.animating = true;
    this.pending = this.host.runTransition(fromRatio, visualTarget, duration, done);
  }

  private commit(resolved: number): void {
    if (resolved !== this.index) {
      this.index = resolved;
      this.callbacks.onIndexChange?.(resolved);
    }
  }

  destroy(): void {
    this.pending?.cancel();
    this.pending = null;
    this.animating = false;
  }
}
