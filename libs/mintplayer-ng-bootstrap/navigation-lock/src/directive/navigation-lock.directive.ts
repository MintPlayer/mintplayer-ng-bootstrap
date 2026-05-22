import { DestroyRef, Directive, inject, input } from '@angular/core';
import { Observable } from 'rxjs';
import { BS_NAVIGATION_LOCK_CONFIRM, BsNavigationLockService } from '../service/navigation-lock.service';
import { BsNavigationLockHandle } from '../service/navigation-lock-handle';

/**
 * Marks the host as a navigation-blocker. Drop `[bsNavigationLock]` on a real
 * element (typically the form). Set `[canExit]` to a boolean, function, or
 * Observable. The service consults every active lock on Router navigation
 * (via `bsNavigationLockGuard` registered at the root) and on `beforeunload`.
 *
 * Fallback: if `canExit` is not set but `exitMessage` is, the directive uses
 * the injected `BS_NAVIGATION_LOCK_CONFIRM` hook with that message.
 */
@Directive({
  selector: '[bsNavigationLock]',
  exportAs: 'bsNavigationLock',
})
export class BsNavigationLockDirective implements BsNavigationLockHandle {
  private readonly destroy = inject(DestroyRef);
  private readonly service = inject(BsNavigationLockService);
  private readonly confirmFn = inject(BS_NAVIGATION_LOCK_CONFIRM);

  readonly canExit = input<
    | boolean
    | ((reason?: string) => boolean | Promise<boolean> | Observable<boolean>)
    | Observable<boolean>
    | undefined
  >(undefined);
  readonly exitMessage = input<string | undefined>(undefined);

  constructor() {
    this.service.register(this);
    this.destroy.onDestroy(() => this.service.unregister(this));
  }

  requestCanExit(reason?: string): boolean | Promise<boolean> | Observable<boolean> {
    const canExit = this.canExit();
    if (canExit === undefined) {
      const msg = this.exitMessage();
      if (msg) return Promise.resolve(this.confirmFn(msg));
      return true;
    }
    if (typeof canExit === 'boolean') return canExit;
    if (typeof canExit === 'function') return canExit(reason);
    return canExit; // Observable<boolean>
  }
}
