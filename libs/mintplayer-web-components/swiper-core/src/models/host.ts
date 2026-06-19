import { SwipeOrientation } from './types';

/**
 * Static margin offsets applied to the moving track. Exactly the two members
 * for the active axis are numbers; the perpendicular pair is `null` (attribute
 * removed). In `fade` mode all four are `null` — slides are positioned by CSS
 * (`position: absolute`) instead of margins.
 *
 * Units mirror the original Angular host bindings: the primary/secondary axis
 * is expressed as a **percentage** for horizontal and as **pixels** for
 * vertical (because vertical slides have no intrinsic percentage basis).
 */
export interface SwipeTrackOffset {
  marginLeftPercent: number | null;
  marginRightPercent: number | null;
  marginTopPx: number | null;
  marginBottomPx: number | null;
}

/**
 * A margin keyframe transition the host runs on the track element. The engine
 * computes the from/to margins in pixels along the active axis; the host maps
 * primary → margin-left (horizontal) / margin-top (vertical) and secondary →
 * margin-right / margin-bottom, and animates over `durationMs`.
 *
 * Delegating the actual playback lets each host pick its mechanism — the Lit
 * web component uses the Web Animations API, the Angular adapter keeps
 * `AnimationBuilder` — without the engine depending on either.
 */
export interface SwipeAnimationSpec {
  orientation: SwipeOrientation;
  fromPrimaryPx: number;
  fromSecondaryPx: number;
  toPrimaryPx: number;
  toSecondaryPx: number;
  durationMs: number;
}

/**
 * Handle to a running animation so the engine can cut it short. `finish` jumps
 * to the end state and MUST invoke the `onDone` passed to `runAnimation`;
 * `cancel` stops without invoking it.
 */
export interface SwipeAnimationHandle {
  finish(): void;
  cancel(): void;
}

/**
 * The host's side of the contract — the small, genuinely environment-specific
 * surface the pure engine cannot own: writing to the DOM, measuring the
 * container, and playing an animation. Everything else (gesture math,
 * direction lock, index state machine, offset computation, keyboard mapping)
 * lives in the engine.
 */
export interface SwipeEngineHost {
  /** Write the current static margin offsets to the moving track. */
  applyTrackOffset(offset: SwipeTrackOffset): void;

  /**
   * Length of the container along the active axis, in pixels: the track's
   * client width (horizontal) or the tallest slide's height (vertical). Used
   * to convert a pixel drag delta into a percentage and to build animation
   * keyframes.
   */
  getContainerLength(): number;

  /**
   * Play a margin transition on the track. Call `onDone` exactly once when it
   * settles (or when `finish` is called). Return a handle the engine keeps so
   * it can finish/cancel an in-flight transition before starting the next.
   */
  runAnimation(spec: SwipeAnimationSpec, onDone: () => void): SwipeAnimationHandle;
}

/**
 * Outbound notifications. All optional — a host wires only what it needs.
 * `onIndexChange` fires on every committed slide change; the animation pair
 * brackets each transition; `onRender` signals that derived display state
 * (offsets, current slide height) may have changed.
 */
export interface SwipeEngineCallbacks {
  onIndexChange?(index: number): void;
  onAnimationStart?(): void;
  onAnimationEnd?(): void;
  onRender?(): void;
}
