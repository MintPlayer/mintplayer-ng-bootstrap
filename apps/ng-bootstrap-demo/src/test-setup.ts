import 'zone.js';
import 'zone.js/testing';
import { getTestBed } from '@angular/core/testing';
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
