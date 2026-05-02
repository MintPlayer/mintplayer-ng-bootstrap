import { Directive } from '@angular/core';

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
 */
@Directive({
  selector: '[bsSwipeViewport]',
  host: {
    '[style.overscroll-behavior]': '"contain"',
    '[style.pointer-events]': '"none"',
  },
})
export class BsSwipeViewportDirective {}
