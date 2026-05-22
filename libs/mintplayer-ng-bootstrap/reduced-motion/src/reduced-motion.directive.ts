import { isPlatformBrowser } from '@angular/common';
import { DestroyRef, Directive, inject, PLATFORM_ID, signal, type Signal } from '@angular/core';
/**
 * Tracks `(prefers-reduced-motion: reduce)` live and exposes the result as a
 * signal. Designed to be composed onto a host component via `hostDirectives`
 * so the host can `inject(BsReducedMotionDirective)` and read `matches()` to
 * gate animations / auto-advance / non-essential motion. SSR-safe — on the
 * server (or in environments without `matchMedia`) the signal stays `false`.
 *
 * Usage:
 *   @Component({
 *     // ...
 *     hostDirectives: [BsReducedMotionDirective],
 *   })
 *   export class MyComponent {
 *     private readonly reducedMotion = inject(BsReducedMotionDirective);
 *     readonly animationsDisabled = computed(() => this.reducedMotion.matches());
 *   }
 *
 * Or attach as a template attribute and read via a template reference:
 *   <div bsReducedMotion #rm="bsReducedMotion">
 *     <span *ngIf="!rm.matches()">animated content</span>
 *   </div>
 */
@Directive({
  selector: '[bsReducedMotion]',
  exportAs: 'bsReducedMotion',
})
export class BsReducedMotionDirective {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private readonly _matches = signal(false);

  readonly matches: Signal<boolean> = this._matches.asReadonly();

  constructor() {
    if (
      isPlatformBrowser(this.platformId) &&
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function'
    ) {
      const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
      this._matches.set(mql.matches);
      const listener = (e: MediaQueryListEvent) => this._matches.set(e.matches);
      mql.addEventListener('change', listener);
      this.destroyRef.onDestroy(() => mql.removeEventListener('change', listener));
    }
  }
}
