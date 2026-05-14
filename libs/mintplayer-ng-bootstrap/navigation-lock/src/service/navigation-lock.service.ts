import { isPlatformBrowser } from '@angular/common';
import { DestroyRef, inject, Injectable, InjectionToken, isDevMode, PLATFORM_ID } from '@angular/core';
import { ROUTER_CONFIGURATION } from '@angular/router';
import { defaultIfEmpty, firstValueFrom, isObservable, Observable, take } from 'rxjs';
import { BsNavigationLockHandle } from './navigation-lock-handle';

/** Confirm hook used by the directive's fallback path (canExit undefined + exitMessage set). */
export const BS_NAVIGATION_LOCK_CONFIRM = new InjectionToken<
  (message: string) => boolean | Promise<boolean>
>('BS_NAVIGATION_LOCK_CONFIRM', {
  providedIn: 'root',
  factory: () => (message: string) =>
    typeof window === 'undefined' ? true : window.confirm(message),
});

@Injectable({ providedIn: 'root' })
export class BsNavigationLockService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroy = inject(DestroyRef);
  private readonly locks = new Set<BsNavigationLockHandle>();
  private pending: Promise<boolean> | null = null;

  constructor() {
    if (isDevMode()) {
      // canceledNavigationResolution is needed to restore the history stack
      // on popstate-cancel. Default 'replace' loses the popped entry. The
      // value is set via ROUTER_CONFIGURATION (typically through
      // withRouterConfig in provideRouter); read it directly from the token
      // since Router.options is private in the public type.
      const config = inject(ROUTER_CONFIGURATION, { optional: true });
      if (config?.canceledNavigationResolution !== 'computed') {
        console.warn(
          '[BsNavigationLockService] Router.canceledNavigationResolution is not "computed". ' +
          'Pass withRouterConfig({ canceledNavigationResolution: "computed" }) to provideRouter ' +
          'so popstate cancellations restore the history stack correctly.',
        );
      }
    }

    if (isPlatformBrowser(this.platformId)) {
      const handler = (ev: BeforeUnloadEvent) => this.onBeforeUnload(ev);
      window.addEventListener('beforeunload', handler);
      this.destroy.onDestroy(() => window.removeEventListener('beforeunload', handler));
    }
  }

  /** Internal — called by directive on init. */
  register(lock: BsNavigationLockHandle): void {
    this.locks.add(lock);
  }

  /** Internal — called by directive on destroy. */
  unregister(lock: BsNavigationLockHandle): void {
    this.locks.delete(lock);
  }

  /**
   * Programmatic check: ask every active lock if exit is OK.
   * Resolves true only when every lock allows exit. Short-circuits on first false.
   *
   * Re-entrant calls while a check is already in flight return the same Promise
   * — only the first `reason` is consulted. This dedups both router-driven
   * fires (e.g. `canMatch` running once) and programmatic call sites that
   * might invoke `requestExit` multiple times in the same tick.
   */
  requestExit(reason?: string): Promise<boolean> {
    if (this.pending) return this.pending;
    const p = this.doRequestExit(reason);
    this.pending = p;
    // Clear `pending` via .finally() AFTER the outer assignment, not inside
    // `doRequestExit`'s body. Reason: when every lock resolves synchronously
    // (or `locks` is empty), `doRequestExit`'s try/finally runs to completion
    // BEFORE this assignment line executes — so an inner `finally { pending =
    // null }` would be immediately overwritten by `this.pending = p`, leaving
    // pending stuck on a resolved Promise. Every subsequent navigation then
    // short-circuits on the truthy cache without consulting locks. The
    // `=== p` guard avoids clobbering a fresh pending if someone calls
    // requestExit again before this microtask runs.
    p.finally(() => {
      if (this.pending === p) this.pending = null;
    });
    return p;
  }

  private async doRequestExit(reason?: string): Promise<boolean> {
    for (const lock of this.locks) {
      const ok = await this.normalise(lock.requestCanExit(reason));
      if (!ok) return false;
    }
    return true;
  }

  private onBeforeUnload(ev: BeforeUnloadEvent): void {
    // PRD §5.4 — sync-first, browser does NOT await async results.
    for (const lock of this.locks) {
      const result = lock.requestCanExit();
      if (typeof result === 'boolean') {
        if (!result) { ev.preventDefault(); ev.returnValue = ''; return; }
        continue;
      }
      // Promise / Observable — safe default: prompt the browser confirm.
      ev.preventDefault();
      ev.returnValue = '';
      return;
    }
  }

  private normalise(r: boolean | Promise<boolean> | Observable<boolean>): Promise<boolean> {
    if (typeof r === 'boolean') return Promise.resolve(r);
    if (isObservable(r)) return firstValueFrom(r.pipe(take(1), defaultIfEmpty(true)));
    return r;
  }
}
