// Lit prints "Lit is in dev mode." once per vitest worker; across the whole
// suite that clobbers CI logs. Pre-seeding the issued-warnings set with the
// warning's CODE is Lit's supported off-switch (reactive-element checks
// `litIssuedWarnings.has(code)` before warning). Must run before lit loads.
(globalThis as { litIssuedWarnings?: Set<unknown> }).litIssuedWarnings = new Set(['dev-mode']);

import { getTestBed, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';

// jsdom doesn't define ResizeObserver. Components that use it (e.g. the
// carousel's slide-height tracking) crash on render without this stub.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  } as typeof ResizeObserver;
}

getTestBed().initTestEnvironment(
  BrowserTestingModule,
  platformBrowserTesting(),
  { teardown: { destroyAfterEach: true } }
);

TestBed.configureTestingModule({
  providers: [provideZonelessChangeDetection()],
});
