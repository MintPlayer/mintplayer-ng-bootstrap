import { computed, contentChild, Directive, ElementRef, inject, input } from '@angular/core';
import { BsSwipeContainerDirective } from '../swipe-container/swipe-container.directive';

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
 * Owns the focusable, key-handling region for the swiper widget — APG
 * carousel pattern places the slide-rotation tab stop here, not on the
 * inner container or per-slide. Adds `tabindex` (default `0`), forwards
 * `aria-orientation` + `aria-keyshortcuts` from the inner container, and
 * delegates ArrowLeft/Right/Up/Down + Home/End keydowns to
 * `BsSwipeContainerDirective.onKeyPress` only when the viewport itself is
 * the event target — so an input/link inside a slide keeps its own key
 * behaviour. Also owns the live-region tuple (`aria-live`, `-atomic`,
 * `-relevant`, `-busy`) since the viewport is what SRs watch for slide
 * content changes.
 */
@Directive({
  selector: '[bsSwipeViewport]',
  host: {
    '[style.overscroll-behavior]': '"contain"',
    '[style.pointer-events]': '"none"',
    '[attr.tabindex]': 'tabIndex()',
    '[attr.aria-live]': 'ariaLive()',
    '[attr.aria-atomic]': 'ariaAtomic()',
    '[attr.aria-relevant]': 'ariaRelevant()',
    '[attr.aria-busy]': 'ariaBusy()',
    '[attr.aria-orientation]': 'effectiveOrientation()',
    '[attr.aria-keyshortcuts]': 'effectiveKeyshortcuts()',
    '(keydown.ArrowLeft)': 'onKeyPress($event)',
    '(keydown.ArrowRight)': 'onKeyPress($event)',
    '(keydown.ArrowUp)': 'onKeyPress($event)',
    '(keydown.ArrowDown)': 'onKeyPress($event)',
    '(keydown.Home)': 'onKeyPress($event)',
    '(keydown.End)': 'onKeyPress($event)',
  },
})
export class BsSwipeViewportDirective {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * Tabindex on the viewport. Default `0` makes the swiper a single tab
   * stop — APG carousel pattern. Pass `null` to opt out (e.g., a swipe
   * card grid that doesn't need a focus stop), or `-1` for
   * programmatic-only focus.
   */
  tabIndex = input<number | null>(0);

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

  /**
   * The inner `bsSwipeContainer` is required for the keydown delegation
   * and the orientation / keyshortcuts forwarding. `contentChild` is the
   * natural query because the container is always a descendant; the lookup
   * settles on first CD pass.
   */
  private readonly container = contentChild(BsSwipeContainerDirective);

  readonly effectiveOrientation = computed(() => this.container()?.orientation() ?? null);
  readonly effectiveKeyshortcuts = computed(() => this.container()?.ariaKeyshortcuts() ?? null);

  /**
   * Forwards the keydown to the container only when the viewport itself
   * holds focus — `event.target === host` — so a focusable descendant
   * (form input, link inside a slide) keeps native key handling. APG
   * carousel pattern requires this guard.
   */
  onKeyPress(event: Event) {
    if (event.target !== this.el.nativeElement) return;
    this.container()?.onKeyPress(event);
  }
}
