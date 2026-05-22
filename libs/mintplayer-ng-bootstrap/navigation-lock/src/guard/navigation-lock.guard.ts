import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { BsNavigationLockService } from '../service/navigation-lock.service';
/**
 * Functional `canActivate` guard the consumer registers ONCE at the root
 * route (paired with `runGuardsAndResolvers: 'always'` so it re-fires on
 * every navigation, not just the first one):
 *
 * ```ts
 * {
 *   path: '',
 *   canActivate: [bsNavigationLockGuard],
 *   runGuardsAndResolvers: 'always',
 *   children: [...],
 * }
 * ```
 *
 * Why `canActivate` and not `canMatch`: `canMatch` excludes the route from
 * URL matching when it returns false. If your config has only one top-level
 * route, returning false from `canMatch` leaves the router with nothing to
 * navigate to — the URL still updates (the cancellation isn't propagated
 * back through History API) and the user lands on a blank page. `canActivate`
 * is Angular's "block this navigation" hook — returning false cancels the
 * navigation cleanly and (with `canceledNavigationResolution: 'computed'`)
 * restores the URL.
 *
 * Programmatic call sites that need a `reason` argument should call
 * `BsNavigationLockService.requestExit(reason)` directly.
 */
export const bsNavigationLockGuard: CanActivateFn = () => {
  return inject(BsNavigationLockService).requestExit();
};
