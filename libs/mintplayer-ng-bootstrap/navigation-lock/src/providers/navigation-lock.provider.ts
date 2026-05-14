import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { provideRouter, RouterFeatures, Routes, withRouterConfig } from '@angular/router';
import { bsNavigationLockGuard } from '../guard/navigation-lock.guard';
import { BS_NAVIGATION_LOCK_CONFIRM } from '../service/navigation-lock.service';

export interface NavigationLockOptions {
  confirm?: (message: string) => boolean | Promise<boolean>;
}

/**
 * Optional provider. Without it, the service is still root-provided and
 * uses `window.confirm` as the default fallback confirm UI.
 */
export function provideNavigationLock(opts?: NavigationLockOptions): EnvironmentProviders {
  return makeEnvironmentProviders([
    ...(opts?.confirm
      ? [{ provide: BS_NAVIGATION_LOCK_CONFIRM, useValue: opts.confirm }]
      : []),
  ]);
}

/**
 * One-call router setup for navigation-lock. Wraps `routes` in a root
 * `{ path: '', canActivate: [bsNavigationLockGuard], runGuardsAndResolvers:
 * 'always', children }` entry and applies `canceledNavigationResolution:
 * 'computed'` (required for popstate-cancel to restore the history stack).
 * Pass any additional router features (`withPreloading`,
 * `withInMemoryScrolling`, …) as extra arguments.
 *
 * `runGuardsAndResolvers: 'always'` is essential: by default `canActivate`
 * only re-runs when route params change, so navigating between siblings of
 * the root wrapper (the common case) would otherwise bypass the lock.
 *
 * If you also pass your own `withRouterConfig`, make sure it includes
 * `canceledNavigationResolution: 'computed'` — the dev-mode warning from
 * `BsNavigationLockService` will fire otherwise.
 */
export function provideNavigationLockRouter(
  routes: Routes,
  ...features: RouterFeatures[]
): EnvironmentProviders {
  return provideRouter(
    [
      {
        path: '',
        canActivate: [bsNavigationLockGuard],
        runGuardsAndResolvers: 'always',
        children: routes,
      },
    ],
    withRouterConfig({ canceledNavigationResolution: 'computed' }),
    ...features,
  );
}
