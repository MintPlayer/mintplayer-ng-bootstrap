import { InjectionToken, Signal } from '@angular/core';
import { Size } from '@mintplayer/ng-swiper/observe-size';

/**
 * Minimal contract a slide must satisfy to be queried by `bsSwipeContainer`.
 *
 * The container uses two pieces of slide state:
 * - `offside()` distinguishes wraparound clones from real slides
 * - `observeSize.size()` feeds the container's slide-height computation
 *
 * Modelling this as a token + interface (rather than `contentChildren(BsSwipeDirective)`
 * directly) breaks a circular import between the swipe and swipe-container
 * directive modules. The cycle is harmless for class-based `inject()` (which
 * resolves at construction time), but it caused the container's lazy
 * `extractQueriesMetadata` getter to see `BsSwipeDirective` as undefined in
 * vitest's JIT-compiled test environment, which made render-based specs
 * impossible. Routing the query through this token-and-interface pair fixes
 * that without requiring a deeper refactor.
 */
export interface BsSwipeSlide {
  offside: Signal<boolean>;
  observeSize: { size: Signal<Size | undefined> };
}

export const BS_SWIPE_SLIDE = new InjectionToken<BsSwipeSlide>('BsSwipeSlide');
