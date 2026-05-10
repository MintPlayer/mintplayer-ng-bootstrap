import { Directive, input } from '@angular/core';

/**
 * Marks an element as the static viewport that wraps a `bsSwipeContainer`'s
 * moving track. The element it's applied to is expected to have
 * `overflow: hidden` (via a class or its own styling) so the moving track
 * is clipped to a fixed window.
 *
 * Applies the CSS that historically lived on the consuming component's
 * outer wrapper (bs-carousel's `.carousel-inner`):
 *
 * - `overscroll-behavior: contain` — keeps Firefox Android's APZ from
 *   chaining a vertical drag into the document and triggering native
 *   pull-to-refresh. Even though Firefox documented this as not honoured
 *   for PTR historically, the empirical behaviour on the carousel demo
 *   showed this property was load-bearing alongside the per-slide
 *   `touch-action: pan-x`.
 *
 * - `pointer-events: none` — pairs with the `bsSwipe`'s `pe-auto` so taps
 *   on the gaps between slides (or on the viewport's letterboxing) pass
 *   through, while the slides themselves remain interactive.
 *
 * Also owns the live-region ARIA tuple (`aria-live`, `aria-atomic`,
 * `aria-relevant`, `aria-busy`) since the viewport is the natural element
 * SRs watch for slide-content changes — see PRD `swiper-aria.md` §4.3.
 */
@Directive({
  selector: '[bsSwipeViewport]',
  host: {
    '[style.overscroll-behavior]': '"contain"',
    '[style.pointer-events]': '"none"',
    '[attr.aria-live]': 'ariaLive()',
    '[attr.aria-atomic]': 'ariaAtomic()',
    '[attr.aria-relevant]': 'ariaRelevant()',
    '[attr.aria-busy]': 'ariaBusy()',
  },
})
export class BsSwipeViewportDirective {
  /**
   * Drives the `aria-live` host attribute. Auto-advancing consumers can pass
   * a computed signal that flips between `'off'` (during rotation) and
   * `'polite'` (when paused / no auto-advance / reduced motion). Default
   * `'off'` matches the carousel's "do not announce on every rotation tick"
   * baseline.
   */
  ariaLive = input<'off' | 'polite' | 'assertive'>('off');

  /**
   * Whether SRs should re-read the entire region on change (`true`) or only
   * the diff (`false`). Default `false` — matches the typical case where
   * only the active slide is meaningful.
   */
  ariaAtomic = input<boolean | null>(false);

  /**
   * Which kinds of mutations should trigger the live announcement. Default
   * `null` (attribute absent → SRs use their own default of
   * `'additions text'`). Consumers that want to tune this pass a value such
   * as `'all'` or `'additions'`.
   */
  ariaRelevant = input<string | null>(null);

  /**
   * Hide the region from announcements while a transition is in flight, so
   * the SR only reads the *final* slide. Default `null` (not busy);
   * consumers wanting the polish wire it to the swipe container's
   * `isAnimating` signal.
   */
  ariaBusy = input<boolean | null>(null);
}
