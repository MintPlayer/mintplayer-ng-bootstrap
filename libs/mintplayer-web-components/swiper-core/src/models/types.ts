export type SwipeOrientation = 'horizontal' | 'vertical';
export type SwipeAnimation = 'slide' | 'fade' | 'none';

/**
 * Per-slide state the engine needs. The host re-supplies this whenever the
 * slide set or a measured size changes (via `SwipeEngine.setSlides`).
 *
 * - `offside` marks wraparound clones (the duplicated first/last slide a
 *   `slide`-mode carousel renders just outside the viewport for a seamless
 *   loop). Clones are excluded from the navigable count.
 * - `height` is the measured pixel height of the slide; `0` means "not
 *   measured yet" and the engine treats it as unknown.
 */
export interface SwipeSlideState {
  offside: boolean;
  height: number;
}

export interface SwipeEngineConfig {
  orientation: SwipeOrientation;
  animation: SwipeAnimation;
  /** Minimum drag distance (px) that commits a slide change. Below it, snap back. */
  minimumOffset: number;
  /** Whether `onKeyPress` translates arrows / Home / End into navigation. */
  keyboardEvents: boolean;
}

export const DEFAULT_SWIPE_CONFIG: SwipeEngineConfig = {
  orientation: 'horizontal',
  animation: 'slide',
  minimumOffset: 50,
  keyboardEvents: true,
};
