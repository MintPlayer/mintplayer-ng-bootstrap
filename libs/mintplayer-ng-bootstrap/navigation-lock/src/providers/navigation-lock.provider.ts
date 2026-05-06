import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
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
