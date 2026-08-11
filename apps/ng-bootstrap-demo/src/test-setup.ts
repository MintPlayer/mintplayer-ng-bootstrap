// Lit prints "Lit is in dev mode." once per vitest worker; across the whole
// suite that clobbers CI logs. Pre-seeding the issued-warnings set with the
// warning's CODE is Lit's supported off-switch (reactive-element checks
// `litIssuedWarnings.has(code)` before warning). Must run before lit loads.
(globalThis as { litIssuedWarnings?: Set<unknown> }).litIssuedWarnings = new Set(['dev-mode']);

import { getTestBed, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { vi } from 'vitest';

// Mock ResizeObserver for components that need it
global.ResizeObserver = class MockedResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
};

// No global `hljs` stub any more: ngx-highlightjs is gone, and
// <mp-code-snippet> imports highlight.js/lib/core as a module and fetches
// grammars through its own generated loader map. Nothing reads window.hljs, so
// a stub here would only mask a real regression.

getTestBed().initTestEnvironment(
  BrowserTestingModule,
  platformBrowserTesting(),
  { teardown: { destroyAfterEach: true } }
);

TestBed.configureTestingModule({
  providers: [provideZonelessChangeDetection()],
});
