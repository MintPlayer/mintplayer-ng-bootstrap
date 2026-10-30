import { InjectionToken, makeEnvironmentProviders, type EnvironmentProviders } from '@angular/core';
import { DEFAULT_PREFETCH_TIMEOUT } from '@mintplayer/ui-core/transfer-state';

export interface MachineSsrOptions {
  /**
   * How long a server render waits for one component's prefetch (a `[fetch]`
   * datatable's first page with a `stateKey`), ms. On expiry the component
   * renders its loading state and the browser fetches. Default 3000 (#448 D6).
   */
  readonly prefetchTimeout?: number;
}

export const MACHINE_SSR_OPTIONS = new InjectionToken<MachineSsrOptions>('mp-machine-ssr-options', {
  factory: () => ({ prefetchTimeout: DEFAULT_PREFETCH_TIMEOUT }),
});

/** App-level settings for components that load data during a server render. */
export function provideMachineSsr(options: MachineSsrOptions): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: MACHINE_SSR_OPTIONS, useValue: { prefetchTimeout: DEFAULT_PREFETCH_TIMEOUT, ...options } }]);
}
