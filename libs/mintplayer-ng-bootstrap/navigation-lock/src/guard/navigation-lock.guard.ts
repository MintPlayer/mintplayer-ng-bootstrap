import { inject } from '@angular/core';
import { CanMatchFn } from '@angular/router';
import { BsNavigationLockService } from '../service/navigation-lock.service';

/**
 * Functional `canMatch` guard the consumer registers ONCE at the root route:
 *
 * ```ts
 * { path: '', canMatch: [bsNavigationLockGuard], children: [...] }
 * ```
 *
 * `canMatch` is the right Angular guard for "should this navigation be allowed
 * to start": it runs once per route-match attempt, regardless of how deeply
 * nested the destination is. (`canActivateChild` would fire once per descendant
 * activation — N prompts for an N-deep destination.)
 *
 * Note: when `canMatch` returns false the router treats the route as not
 * matching; if a sibling route or wildcard fallback matches the destination URL,
 * the user lands there instead of staying put. Most apps don't have a `**`
 * redirect that conflicts; if yours does, additionally guard the wildcard.
 *
 * Programmatic call sites that need a `reason` argument should call
 * `BsNavigationLockService.requestExit(reason)` directly.
 */
export const bsNavigationLockGuard: CanMatchFn = () => {
  return inject(BsNavigationLockService).requestExit();
};
