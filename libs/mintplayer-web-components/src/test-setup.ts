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
    thresholds: readonly number[] = [];
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  } as typeof IntersectionObserver;
}
