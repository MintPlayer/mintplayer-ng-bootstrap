// Lit prints "Lit is in dev mode." once per vitest worker; across the whole
// suite that clobbers CI logs. Pre-seeding the issued-warnings set with the
// warning's CODE is Lit's supported off-switch (reactive-element checks
// `litIssuedWarnings.has(code)` before warning). Must run before lit loads.
(globalThis as { litIssuedWarnings?: Set<unknown> }).litIssuedWarnings = new Set(['dev-mode']);

import { getTestBed, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from '@angular/platform-browser-dynamic/testing';
import { vi } from 'vitest';

// Mock ResizeObserver for components that need it
global.ResizeObserver = class MockedResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
};

// Mock highlight.js at the window level to prevent "not imported" errors
// This provides a minimal implementation that ngx-highlightjs can use
(global as any).hljs = {
  highlight: (code: string) => ({ value: code, language: 'plaintext' }),
  highlightAuto: (code: string) => ({ value: code, language: 'plaintext' }),
  highlightElement: () => {},
  configure: () => {},
  listLanguages: () => [],
  getLanguage: () => undefined,
  registerLanguage: () => {},
  registerAliases: () => {},
};

getTestBed().initTestEnvironment(
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting(),
  { teardown: { destroyAfterEach: true } }
);

TestBed.configureTestingModule({
  providers: [provideZonelessChangeDetection()],
});
