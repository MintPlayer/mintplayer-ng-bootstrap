export type SwipeOrientation = 'horizontal' | 'vertical';

/**
 * Semantic navigation intents. Input arbiters (pointer, wheel, keyboard) reduce
 * raw input to these; the consumer routes them into an {@link IndexMachine}
 * (or its own index logic — a scroll-snap consumer needs no machine at all).
 */
export type SwipeIntent = 'previous' | 'next' | 'first' | 'last';

// ---------------------------------------------------------------------------
// Pointer arbiter
// ---------------------------------------------------------------------------

export interface PointerArbiterConfig {
  orientation: SwipeOrientation;
  /**
   * Primary-axis movement (px) before the gesture locks onto its axis and the
   * caller should start calling preventDefault(). 3px — deliberately small so
   * the lock can engage on the first or second move event, before Firefox
   * Android's APZ claims a downward gesture as pull-to-refresh.
   */
  swipeThresholdPx?: number;
  /**
   * How long (ms) a press must survive before it is treated as a drag rather
   * than a tap. A release inside this window is reported as a tap and produces
   * no drag events.
   */
  startDelayMs?: number;
}

export interface PointerArbiterCallbacks {
  /** The press outlived the start delay: a drag is now in progress. */
  onDragStart?(): void;
  /** Live primary-axis delta from the drag origin, in px. */
  onDragMove?(deltaPx: number): void;
  /** The pointer lifted after a settled drag. */
  onDragEnd?(deltaPx: number): void;
  /** The pointer lifted inside the start-delay window. */
  onTap?(): void;
}

// ---------------------------------------------------------------------------
// Wheel arbiter — CONTRACT ONLY for now. Implemented alongside the fullpage
// component (its first real consumer). Wheel is not touch-with-other-events:
// there is no down/up to bracket a gesture, one trackpad flick emits dozens of
// momentum deltas that must resolve to a single intent, and the implementation
// needs a post-intent cooldown plus a deceleration test to reject the tail.
// ---------------------------------------------------------------------------

export interface WheelArbiterConfig {
  orientation: SwipeOrientation;
  /** Accumulated primary-axis delta (px) that resolves to one intent. */
  intentThresholdPx?: number;
  /** Quiet period (ms) after an intent during which further deltas are ignored. */
  cooldownMs?: number;
}

export interface WheelArbiterCallbacks {
  onIntent?(intent: Extract<SwipeIntent, 'previous' | 'next'>): void;
}

/**
 * A wheel/trackpad input arbiter: feed it wheel deltas, it emits at most one
 * intent per physical gesture. `wheel(deltaPx)` returns `true` when the caller
 * should preventDefault() (the arbiter owns the axis for this gesture).
 */
export interface WheelArbiter {
  wheel(deltaPx: number): boolean;
  destroy(): void;
}

// ---------------------------------------------------------------------------
// Index machine
// ---------------------------------------------------------------------------

/**
 * Handle to an in-flight transition, with the interruption contract every
 * swipe UI needs: `finish()` jumps to the end state and MUST invoke the
 * transition's `onDone`; `cancel()` abandons it and MUST NOT.
 */
export interface TransitionHandle {
  finish(): void;
  cancel(): void;
}

/**
 * What the machine needs from its environment. Positions are expressed as a
 * unit-free ratio in slide units: ratio 0 = slide 0 at rest, 1.5 = halfway
 * between slides 1 and 2. During a wrap transition the ratio transiently
 * leaves [0, count-1] (e.g. `count` = the after-last wrap cell); the host maps
 * logical ratios to physical positions (a transform, a scroll offset, …).
 */
export interface IndexMachineHost {
  /** Park the track at a position instantly (resting state or live drag). */
  applyOffsetRatio(ratio: number): void;
  /**
   * Animate between two positions over `durationMs` (> 0 — the machine handles
   * zero-duration moves itself). How the motion looks — a transform, a
   * crossfade timed to match, … — is entirely the host's business.
   */
  runTransition(fromRatio: number, toRatio: number, durationMs: number, onDone: () => void): TransitionHandle;
}

export interface IndexMachineCallbacks {
  /** The committed index changed (never fires for snap-backs or no-ops). */
  onIndexChange?(index: number): void;
  onAnimationStart?(): void;
  onAnimationEnd?(): void;
}

export interface IndexMachineConfig {
  /** Number of navigable slides (excluding any wrap cells the host renders). */
  count: number;
  /**
   * Wrap-around at the edges. Enforced HERE, so every input path — buttons,
   * keyboard, drag release — obeys the same rule.
   */
  wrap?: boolean;
  /** Transition duration. The machine drops it to 0 under reduced motion. */
  durationMs?: number;
  /** Minimum drag distance (px) for a release to commit a slide change. */
  minimumOffsetPx?: number;
  /** Supplier consulted per transition; true → the move is instant. */
  prefersReducedMotion?: () => boolean;
}
