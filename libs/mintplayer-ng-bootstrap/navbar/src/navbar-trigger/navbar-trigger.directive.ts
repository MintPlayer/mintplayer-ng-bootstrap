import { Directive, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

/**
 * Marks a navbar dropdown trigger anchor. Replaces both `routerLink` and
 * `routerLinkActive` on a trigger element: toggles the active CSS class when a
 * sub-route under the bound URL is active, but does NOT navigate on click
 * (which `routerLink` would do via its own host listener, even when other
 * click handlers `preventDefault`).
 *
 * @example
 * ```html
 * <a bsNavbarTrigger="/overlays">Overlays</a>
 * ```
 *
 * Items inside the dropdown panel still use real `[routerLink]`s for
 * navigation. Use this directive only for the trigger anchor that opens the
 * dropdown panel.
 */
@Directive({
  selector: '[bsNavbarTrigger]',
  host: {
    'href': 'javascript:void(0)',
    '[class.active]': 'isActive()',
    '(click)': '$event.preventDefault()',
  },
})
export class BsNavbarTriggerDirective {
  private router = inject(Router);

  readonly bsNavbarTrigger = input.required<string | readonly string[]>();

  private currentUrl = signal(this.router.url);

  private targetUrl = computed(() => {
    const v = this.bsNavbarTrigger();
    if (Array.isArray(v)) {
      // join with '/', collapse double slashes; ensure leading slash
      const joined = (v as readonly string[]).join('/').replace(/\/+/g, '/');
      return joined.startsWith('/') ? joined : '/' + joined;
    }
    return v as string;
  });

  readonly isActive = computed(() => {
    const url = this.currentUrl();
    const target = this.targetUrl();
    return url === target || url.startsWith(target + '/');
  });

  constructor() {
    this.router.events.pipe(
      filter(ev => ev instanceof NavigationEnd),
      takeUntilDestroyed(),
    ).subscribe(() => this.currentUrl.set(this.router.url));
  }
}
