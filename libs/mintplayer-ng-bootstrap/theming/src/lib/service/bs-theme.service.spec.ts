import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DOCUMENT } from '@angular/common';
import { PLATFORM_ID, REQUEST } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  __resetBsThemeStoreForTests,
  getBsThemeStore,
} from '@mintplayer/web-components/theming';
import { BsThemeService } from './bs-theme.service';
import { installFakeBroadcastChannel } from '@mintplayer/web-components/theming/src/testing/fake-broadcast-channel';
import { provideBsTheme } from '../provide-bs-theme';

/**
 * BsThemeService is a pure MIRROR of the core store
 * (libs/mintplayer-web-components/theming/src/store.ts). These tests pin that:
 * the store is the only state, a write on either side shows on both, and the
 * server branch resolves the request cookie against the page's meta default.
 */

interface CookieStub {
  writes: string[];
}

function stubCookie(initial = ''): CookieStub {
  let jar = initial;
  const writes: string[] = [];
  Object.defineProperty(document, 'cookie', {
    configurable: true,
    get: () => jar,
    set: (value: string) => {
      writes.push(value);
      jar = value.split(';')[0];
    },
  });
  return { writes };
}

interface MatchMediaStub {
  setPrefersDark(matches: boolean): void;
}

function stubMatchMedia(prefersDark: boolean): MatchMediaStub {
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  const mql = {
    matches: prefersDark,
    media: '(prefers-color-scheme: dark)',
    addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => listeners.add(listener),
    removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => listeners.delete(listener),
  };
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn(() => mql as unknown as MediaQueryList),
  });
  return {
    setPrefersDark(matches) {
      mql.matches = matches;
      [...listeners].map((listener) => listener({ matches } as MediaQueryListEvent));
    },
  };
}

const themeAttr = () => document.documentElement.getAttribute('data-bs-theme');

// The store opens a BroadcastChannel; the real one crosses worker threads under
// --pool=threads, so another spec file could post a mode into this one. Use the
// in-memory fake, scoped to this file.
installFakeBroadcastChannel();

describe('BsThemeService (browser mirror)', () => {
  beforeEach(() => {
    __resetBsThemeStoreForTests();
    document.documentElement.removeAttribute('data-bs-theme');
    localStorage.clear();
  });

  afterEach(() => {
    __resetBsThemeStoreForTests();
    document.documentElement.removeAttribute('data-bs-theme');
    vi.restoreAllMocks();
  });

  it('seeds its signals from the store', () => {
    stubCookie('bs-theme-mode=sepia');
    stubMatchMedia(false);
    const svc = TestBed.inject(BsThemeService);
    expect(svc.mode()).toBe('sepia');
    expect(svc.effectiveMode()).toBe('sepia');
  });

  it('a store write updates the signals', () => {
    stubCookie();
    stubMatchMedia(false);
    const svc = TestBed.inject(BsThemeService);
    expect(svc.mode()).toBe('auto');

    getBsThemeStore().setMode('dark');
    expect(svc.mode()).toBe('dark');
    expect(svc.effectiveMode()).toBe('dark');
  });

  it('service.setMode reaches the store, the cookie and <html>', () => {
    const cookie = stubCookie();
    stubMatchMedia(false);
    const svc = TestBed.inject(BsThemeService);
    const setMode = vi.spyOn(getBsThemeStore(), 'setMode');

    svc.setMode('light');
    expect(setMode).toHaveBeenCalledWith('light');
    expect(getBsThemeStore().getMode()).toBe('light');
    expect(svc.mode()).toBe('light');
    expect(themeAttr()).toBe('light');
    expect(cookie.writes.some((write) => write.startsWith('bs-theme-mode=light'))).toBe(true);
  });

  it('an invalid setMode is a no-op on both sides', () => {
    stubCookie();
    stubMatchMedia(false);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const svc = TestBed.inject(BsThemeService);
    svc.setMode('x"><script');
    expect(svc.mode()).toBe('auto');
    expect(getBsThemeStore().getMode()).toBe('auto');
  });

  it('effectiveMode follows the OS preference while in auto', () => {
    stubCookie();
    const media = stubMatchMedia(false);
    const svc = TestBed.inject(BsThemeService);
    expect(svc.effectiveMode()).toBe('light');

    media.setPrefersDark(true);
    expect(svc.mode()).toBe('auto');
    expect(svc.effectiveMode()).toBe('dark');
  });

  it('an explicit mode ignores an OS change (sticky), and auto hands control back', () => {
    stubCookie();
    const media = stubMatchMedia(false);
    const svc = TestBed.inject(BsThemeService);
    svc.setMode('light');

    media.setPrefersDark(true);
    expect(svc.mode()).toBe('light');
    expect(svc.effectiveMode()).toBe('light');
    expect(themeAttr()).toBe('light');

    svc.setMode('auto');
    expect(svc.effectiveMode()).toBe('dark');
    expect(themeAttr()).toBe('dark');
  });

  it('cookie dark + empty localStorage stays dark (a server-written theme survives boot)', () => {
    stubCookie('bs-theme-mode=dark');
    stubMatchMedia(false);
    // What the server (or the pre-boot script) already wrote.
    document.documentElement.setAttribute('data-bs-theme', 'dark');
    localStorage.clear();

    const svc = TestBed.inject(BsThemeService);
    expect(svc.mode()).toBe('dark');
    expect(themeAttr()).toBe('dark');
  });

  it('never touches localStorage', () => {
    stubCookie();
    stubMatchMedia(false);
    const getItem = vi.spyOn(Storage.prototype, 'getItem');
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const svc = TestBed.inject(BsThemeService);
    svc.setMode('dark');
    expect(getItem).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
  });

  it('unsubscribes from the store when the injector is destroyed', () => {
    stubCookie();
    stubMatchMedia(false);
    const svc = TestBed.inject(BsThemeService);
    TestBed.resetTestingModule();
    getBsThemeStore().setMode('dark');
    expect(svc.mode()).toBe('auto');
  });

  it('provideBsTheme forwards cookieDomain to the store', () => {
    const cookie = stubCookie();
    stubMatchMedia(false);
    TestBed.configureTestingModule({ providers: [provideBsTheme({ cookieDomain: '.example.com' })] });
    const svc = TestBed.inject(BsThemeService);
    svc.setMode('dark');
    expect(cookie.writes.some((write) => /;\s*Domain=\.example\.com/i.test(write))).toBe(true);
  });
});

describe('BsThemeService (server)', () => {
  function serverDocument(defaultMode?: string): Document {
    const doc = document.implementation.createHTMLDocument('ssr');
    doc.documentElement.setAttribute('lang', 'en');
    if (defaultMode !== undefined) {
      const meta = doc.createElement('meta');
      meta.setAttribute('name', 'bs-theme-default-mode');
      meta.setAttribute('content', defaultMode);
      doc.head.append(meta);
    }
    return doc;
  }

  function render(cookie: string | null, defaultMode?: string, withRequest = true) {
    const doc = serverDocument(defaultMode);
    const request = withRequest
      ? new Request('https://example.com/', { headers: cookie === null ? {} : { cookie } })
      : null;
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: 'server' },
        { provide: REQUEST, useValue: request },
        { provide: DOCUMENT, useValue: doc },
      ],
    });
    const svc = TestBed.inject(BsThemeService);
    return { svc, attr: doc.documentElement.getAttribute('data-bs-theme'), doc };
  }

  beforeEach(() => {
    __resetBsThemeStoreForTests();
  });

  afterEach(() => {
    __resetBsThemeStoreForTests();
  });

  it('writes an explicit cookie mode synchronously and seeds the signals', () => {
    const { svc, attr, doc } = render('a=1; bs-theme-mode=dark; b=2');
    expect(attr).toBe('dark');
    expect(doc.documentElement.getAttribute('lang')).toBe('en');
    expect(svc.mode()).toBe('dark');
    expect(svc.effectiveMode()).toBe('dark');
  });

  it('passes a custom mode through', () => {
    expect(render('bs-theme-mode=sepia').attr).toBe('sepia');
  });

  it('writes no attribute for an auto cookie, even over a non-auto meta', () => {
    const { svc, attr } = render('bs-theme-mode=auto', 'dark');
    expect(attr).toBeNull();
    expect(svc.mode()).toBe('auto');
  });

  it('writes no attribute with no cookie and no meta', () => {
    const { svc, attr } = render(null);
    expect(attr).toBeNull();
    expect(svc.mode()).toBe('auto');
  });

  it('falls back to the meta default when there is no cookie', () => {
    const { svc, attr } = render(null, 'dark');
    expect(attr).toBe('dark');
    expect(svc.mode()).toBe('dark');
  });

  it('treats REQUEST null (prerender, extraction) as no cookie', () => {
    expect(render(null, undefined, false).attr).toBeNull();
    TestBed.resetTestingModule();
    expect(render(null, 'light', false).attr).toBe('light');
  });

  it('treats an invalid cookie as absent, so the meta default applies', () => {
    const { attr } = render('bs-theme-mode=x%22%3E%3Cscript', 'dark');
    expect(attr).toBe('dark');
  });

  it('never splices an invalid cookie into markup', () => {
    expect(render('bs-theme-mode=x"><script').attr).toBeNull();
  });

  it('never creates the browser store on the server', () => {
    const { svc } = render('bs-theme-mode=dark');
    svc.setMode('light');
    expect((globalThis as Record<symbol, unknown>)[Symbol.for('mintplayer.bs-theme')]).toBeUndefined();
    expect(svc.mode()).toBe('dark');
  });
});
