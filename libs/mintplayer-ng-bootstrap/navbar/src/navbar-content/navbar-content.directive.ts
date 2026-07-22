import { afterNextRender, Directive, ElementRef, inject, input, OnDestroy, PLATFORM_ID, Renderer2 } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { BsNavbarComponent } from '../navbar/navbar.component';

/**
 * `[bsNavbarContent]` — offsets page content below a `positioning="fixed"`
 * navbar by its LIVE height (replaces hand-maintained `padding-top` constants).
 *
 *     <bs-navbar [positioning]="'fixed'" #nav>…</bs-navbar>
 *     <div [bsNavbarContent]="nav"><router-outlet /></div>
 *
 * On the client a `ResizeObserver` tracks the bar (theme/viewport changes
 * resize it) and sets `padding-top` = the element's own initial padding + the
 * bar height. On the server — where the bar can't be measured — a fixed 58px
 * approximation is serialized into the HTML so SSR/no-JS pages still clear the
 * bar (same contract as the pre-WC directive).
 */
@Directive({
  selector: '[bsNavbarContent]',
})
export class BsNavbarContentDirective implements OnDestroy {
  /** The `bs-navbar` to clear — pass its template reference (`#nav`). */
  readonly navbar = input.required<BsNavbarComponent>({ alias: 'bsNavbarContent' });

  /** Server-side height approximation (px) — the bar isn't measurable there. */
  static readonly SSR_NAVBAR_HEIGHT = 58;

  readonly #element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  readonly #renderer = inject(Renderer2);
  #observer?: ResizeObserver;

  constructor() {
    if (isPlatformServer(inject(PLATFORM_ID))) {
      this.#setPadding(BsNavbarContentDirective.SSR_NAVBAR_HEIGHT);
      return;
    }
    afterNextRender(() => {
      // The measurable bar is the WC inside the wrapper host (the host itself
      // is inline and reports no height for a fixed child).
      const bar = this.navbar().elementRef.nativeElement.querySelector('mp-navbar');
      if (!bar) return;
      // Hydration reuses the SSR element, so the 58px approximation this
      // directive wrote server-side is still inline here. Remove it BEFORE
      // measuring, or the author's baseline would double-count it.
      this.#renderer.removeStyle(this.#element, 'padding-top');
      const initial = parseFloat(getComputedStyle(this.#element).paddingTop) || 0;
      this.#observer = new ResizeObserver(() =>
        this.#setPadding(initial + (bar as HTMLElement).offsetHeight),
      );
      this.#observer.observe(bar);
    });
  }

  #setPadding(px: number): void {
    this.#renderer.setStyle(this.#element, 'padding-top', `${px}px`);
  }

  ngOnDestroy(): void {
    this.#observer?.disconnect();
  }
}
