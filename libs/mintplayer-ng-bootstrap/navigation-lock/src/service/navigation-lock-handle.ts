import { Observable } from 'rxjs';

/**
 * Contract a navigation lock implements so the service can consult it.
 * Implemented by `BsNavigationLockDirective`; consumers may also register
 * arbitrary handles via `BsNavigationLockService.register(...)`.
 */
export interface BsNavigationLockHandle {
  /**
   * Returns whether this lock allows exit. May be sync, Promise, or Observable.
   * `reason` is forwarded from `BsNavigationLockService.requestExit(reason)` for
   * programmatic call sites (e.g. `'logout'`); the functional CanActivateChild
   * guard passes `undefined`.
   */
  requestCanExit(reason?: string): boolean | Promise<boolean> | Observable<boolean>;

  /** Optional message shown in the fallback confirm dialog when no `canExit` is set. */
  exitMessage(): string | undefined;
}
