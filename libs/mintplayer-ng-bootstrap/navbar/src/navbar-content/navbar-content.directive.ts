import { isPlatformServer } from '@angular/common';
import { afterNextRender, Directive, ElementRef, inject, input, OnDestroy, PLATFORM_ID, Renderer2, RendererStyleFlags2 } from '@angular/core';
import { BsNavbarComponent } from '../generated';

/** The offset before the bar is measured: Bootstrap's default navbar is 3.5rem tall. */
const ESTIMATE = 'var(--bs-navbar-content-offset, 3.5rem)';

/**
 * `[bsNavbarContent]` — offsets page content below a `positioning="fixed"`
 * navbar by its LIVE height (replaces hand-maintained `padding-top` constants).
 *
 *     <bs-navbar [positioning]="'fixed'" #nav>…</bs-navbar>
 *     <div [bsNavbarContent]="nav"><router-outlet /></div>
 *
 * On the client a `ResizeObserver` tracks the bar (theme/viewport changes
 * resize it) and sets `padding-top` = the element's own initial padding + the
 * bar height. Until then (on the server, and with JavaScript off) the offset
 * is CSS: `--bs-navbar-content-offset`, defaulting to 3.5rem, the height of
 * Bootstrap's default navbar. A theme with a taller bar sets that property.
 */
@Directive({
  selector: '[bsNavbarContent]',
})
export class BsNavbarContentDirective implements OnDestroy {
  /** The `bs-navbar` to clear — pass its template reference (`#nav`). */
  readonly navbar = input.required<BsNavbarComponent>({ alias: 'bsNavbarContent' });

  readonly #element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  readonly #renderer = inject(Renderer2);
  #observer?: ResizeObserver;

  constructor() {
    this.#renderer.setStyle(this.#element, 'padding-top', ESTIMATE, RendererStyleFlags2.DashCase);
    if (isPlatformServer(inject(PLATFORM_ID))) return;
    afterNextRender(() => {
      // The bs-navbar host is the .navbar itself.
      const bar = this.navbar().elementRef.nativeElement;
      // The CSS estimate is still inline here (hydration reuses the server
      // element). Remove it BEFORE measuring, or the author's baseline would
      // count it.
      this.#renderer.removeStyle(this.#element, 'padding-top');
      const initial = parseFloat(getComputedStyle(this.#element).paddingTop) || 0;
      this.#observer = new ResizeObserver(() => this.#setPadding(initial + bar.offsetHeight));
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
