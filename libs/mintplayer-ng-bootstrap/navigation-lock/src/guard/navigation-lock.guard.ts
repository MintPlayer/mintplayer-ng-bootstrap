import { inject } from '@angular/core';
import { CanActivateChildFn } from '@angular/router';
import { BsNavigationLockService } from '../service/navigation-lock.service';

/**
 * Functional guard the consumer registers ONCE at the root route:
 *
 * ```ts
 * { path: '', canActivateChild: [bsNavigationLockGuard], children: [...] }
 * ```
 *
 * Delegates to `BsNavigationLockService.requestExit()`. No first-class
 * "trigger reason" is available inside `CanActivateChildFn`; programmatic
 * call sites that need a reason should call `service.requestExit(reason)`
 * directly.
 */
export const bsNavigationLockGuard: CanActivateChildFn = () => {
  return inject(BsNavigationLockService).requestExit();
};
