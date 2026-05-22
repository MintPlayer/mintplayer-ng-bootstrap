import { getTestBed, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from '@angular/platform-browser-dynamic/testing';

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
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting(),
  { teardown: { destroyAfterEach: true } }
);

TestBed.configureTestingModule({
  providers: [provideZonelessChangeDetection()],
});
