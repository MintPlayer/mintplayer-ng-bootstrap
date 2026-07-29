// Lit prints "Lit is in dev mode." once per vitest worker; across the whole
// suite that clobbers CI logs. Pre-seeding the issued-warnings set with the
// warning's CODE is Lit's supported off-switch (reactive-element checks
// `litIssuedWarnings.has(code)` before warning). Must run before lit loads.
(globalThis as { litIssuedWarnings?: Set<unknown> }).litIssuedWarnings = new Set(['dev-mode']);

// jsdom (the vitest environment) does not implement these browser
// observers; several WCs in this lib use them at construction time and
// crash on render without a stub. Mirrors the polyfills the WCs used to
// inherit from mintplayer-ng-bootstrap's test-setup pre-extraction.

if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  } as typeof ResizeObserver;
}

if (typeof globalThis.IntersectionObserver === 'undefined') {
  globalThis.IntersectionObserver = class {
    root: Element | Document | null = null;
    rootMargin = '';
    scrollMargin = '';
    thresholds: readonly number[] = [];
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  } as typeof IntersectionObserver;
}
