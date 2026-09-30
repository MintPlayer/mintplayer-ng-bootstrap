import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { __resetBsThemeStoreForTests, configureBsTheme, getBsThemeStore } from './store';

// vitest's jsdom environment exposes the JSDOM instance; reconfigure() is the
// only way to change location.protocol (window.location is unforgeable).
declare const jsdom: { reconfigure(options: { url: string }): void };

interface CookieStub {
  /** Every raw `document.cookie = ...` write, attributes included. */
  writes: string[];
  set(value: string): void;
}

/** Replace `document.cookie` with a jar that keeps the last written pair and records writes. */
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
  return { writes, set: (value) => (jar = value) };
}

interface MatchMediaStub {
  /** Flip the OS preference and fire `change` like a real MediaQueryList. */
  setPrefersDark(matches: boolean): void;
  listenerCount(): number;
  calls(): number;
}

function stubMatchMedia(prefersDark: boolean): MatchMediaStub {
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  const mql = {
    matches: prefersDark,
    media: '(prefers-color-scheme: dark)',
    addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => listeners.add(listener),
    removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => listeners.delete(listener),
  };
  const matchMedia = vi.fn(() => mql as unknown as MediaQueryList);
  Object.defineProperty(window, 'matchMedia', { configurable: true, writable: true, value: matchMedia });
  return {
    setPrefersDark(matches) {
      mql.matches = matches;
      [...listeners].map((listener) => listener({ matches } as MediaQueryListEvent));
    },
    listenerCount: () => listeners.size,
    calls: () => matchMedia.mock.calls.length,
  };
}

function setDefaultMeta(content: string): void {
  const meta = document.createElement('meta');
  meta.setAttribute('name', 'bs-theme-default-mode');
  meta.setAttribute('content', content);
  document.head.append(meta);
}

const themeAttr = () => document.documentElement.getAttribute('data-bs-theme');

/** Resolve once `channel` receives a message, or after `ms` with `undefined`. */
function nextMessage(channel: BroadcastChannel, ms = 100): Promise<unknown> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      channel.onmessage = null;
      resolve(undefined);
    }, ms);
    channel.onmessage = (event: MessageEvent) => {
      clearTimeout(timer);
      channel.onmessage = null;
      resolve(event.data);
    };
  });
}

describe('bs-theme store', () => {
  let cookie: CookieStub;
  let media: MatchMediaStub;
  const peers: BroadcastChannel[] = [];
  const peer = () => {
    const channel = new BroadcastChannel('bs-theme-mode');
    peers.push(channel);
    return channel;
  };

  beforeEach(() => {
    __resetBsThemeStoreForTests();
    document.documentElement.removeAttribute('data-bs-theme');
    document.head.innerHTML = '';
    cookie = stubCookie();
    media = stubMatchMedia(false);
  });

  afterEach(() => {
    // Close every channel, or the open BroadcastChannel handles keep the vitest fork alive.
    __resetBsThemeStoreForTests();
    peers.splice(0).map((channel) => channel.close());
    delete (document as { cookie?: string }).cookie;
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('defaults to auto, resolved against the OS preference, and writes the attribute', () => {
      const store = getBsThemeStore();
      expect(store.getMode()).toBe('auto');
      expect(store.effectiveMode()).toBe('light');
      expect(themeAttr()).toBe('light');
    });

    it('restores the mode from the cookie', () => {
      cookie.set('other=1; bs-theme-mode=dark');
      const store = getBsThemeStore();
      expect(store.getMode()).toBe('dark');
      expect(themeAttr()).toBe('dark');
    });

    it('restores a custom mode', () => {
      cookie.set('bs-theme-mode=sepia');
      expect(getBsThemeStore().effectiveMode()).toBe('sepia');
      expect(themeAttr()).toBe('sepia');
    });

    it('falls back to the bs-theme-default-mode meta without a cookie', () => {
      setDefaultMeta('dark');
      expect(getBsThemeStore().getMode()).toBe('dark');
    });

    it('lets a valid cookie (even auto) win over the meta', () => {
      setDefaultMeta('dark');
      cookie.set('bs-theme-mode=auto');
      expect(getBsThemeStore().getMode()).toBe('auto');
    });

    it('treats an invalid cookie as absent', () => {
      setDefaultMeta('dark');
      cookie.set('bs-theme-mode=x%22%3E%3Cscript%3E');
      expect(getBsThemeStore().getMode()).toBe('dark');
    });

    it('does not write the cookie just by starting', () => {
      getBsThemeStore();
      expect(cookie.writes).toEqual([]);
    });
  });

  describe('auto follows prefers-color-scheme live', () => {
    it('re-resolves, rewrites the attribute and notifies on an OS change', () => {
      const store = getBsThemeStore();
      const listener = vi.fn();
      store.subscribe(listener);

      media.setPrefersDark(true);
      expect(store.getMode()).toBe('auto');
      expect(store.effectiveMode()).toBe('dark');
      expect(themeAttr()).toBe('dark');
      expect(listener).toHaveBeenCalledTimes(1);

      media.setPrefersDark(false);
      expect(themeAttr()).toBe('light');
      expect(listener).toHaveBeenCalledTimes(2);
    });

    it('registers exactly one matchMedia listener', () => {
      getBsThemeStore();
      getBsThemeStore();
      configureBsTheme({ cookieDomain: 'example.test' });
      expect(media.calls()).toBe(1);
      expect(media.listenerCount()).toBe(1);
    });
  });

  describe('explicit modes are sticky', () => {
    it('ignores OS changes and does not notify', () => {
      const store = getBsThemeStore();
      store.setMode('light');
      const listener = vi.fn();
      store.subscribe(listener);

      media.setPrefersDark(true);
      expect(store.effectiveMode()).toBe('light');
      expect(themeAttr()).toBe('light');
      expect(listener).not.toHaveBeenCalled();
    });

    it('applies a custom mode verbatim', () => {
      const store = getBsThemeStore();
      store.setMode('sepia');
      media.setPrefersDark(true);
      expect(store.effectiveMode()).toBe('sepia');
      expect(themeAttr()).toBe('sepia');
    });
  });

  describe('setMode', () => {
    it('updates the mode, the attribute and the cookie, and notifies', () => {
      const store = getBsThemeStore();
      const listener = vi.fn();
      store.subscribe(listener);

      store.setMode('dark');
      expect(store.getMode()).toBe('dark');
      expect(themeAttr()).toBe('dark');
      expect(cookie.writes).toEqual(['bs-theme-mode=dark; Path=/; SameSite=Lax; Max-Age=31536000']);
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('persists across a fresh store (restore)', () => {
      getBsThemeStore().setMode('dark');
      __resetBsThemeStoreForTests();
      document.documentElement.removeAttribute('data-bs-theme');
      expect(getBsThemeStore().getMode()).toBe('dark');
      expect(themeAttr()).toBe('dark');
    });

    it('lower-cases the mode', () => {
      const store = getBsThemeStore();
      store.setMode('DARK');
      expect(store.getMode()).toBe('dark');
      expect(cookie.writes[0]).toMatch(/^bs-theme-mode=dark;/);
    });

    it('renews the cookie for an unchanged mode without notifying', () => {
      const store = getBsThemeStore();
      store.setMode('dark');
      const listener = vi.fn();
      store.subscribe(listener);
      store.setMode('dark');
      expect(cookie.writes).toHaveLength(2);
      expect(listener).not.toHaveBeenCalled();
    });

    it.each(['', 'x"><script>', 'dark mode', 'x'.repeat(33), null, 42])(
      'ignores the invalid mode %j with a warning',
      (invalid) => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        const store = getBsThemeStore();
        const listener = vi.fn();
        store.subscribe(listener);

        store.setMode(invalid as string);
        expect(store.getMode()).toBe('auto');
        expect(themeAttr()).toBe('light');
        expect(cookie.writes).toEqual([]);
        expect(listener).not.toHaveBeenCalled();
        expect(warn).toHaveBeenCalledTimes(1);
      },
    );
  });

  describe('cookie attributes', () => {
    it('adds Domain only when cookieDomain is configured, verbatim', () => {
      const store = getBsThemeStore();
      store.setMode('dark');
      expect(cookie.writes[0]).not.toMatch(/Domain=/);

      configureBsTheme({ cookieDomain: '.example.test' });
      store.setMode('light');
      expect(cookie.writes[1]).toMatch(/; Domain=\.example\.test(;|$)/);
    });

    it('accepts configureBsTheme before the store is first used', () => {
      configureBsTheme({ cookieDomain: 'example.test' });
      getBsThemeStore().setMode('dark');
      expect(cookie.writes[0]).toMatch(/; Domain=example\.test(;|$)/);
    });

    it('omits Secure on http:', () => {
      expect(location.protocol).toBe('http:');
      getBsThemeStore().setMode('dark');
      expect(cookie.writes[0]).not.toMatch(/Secure/);
    });

    it('adds Secure on https:', () => {
      const original = location.href;
      jsdom.reconfigure({ url: 'https://example.test/' });
      try {
        getBsThemeStore().setMode('dark');
        expect(cookie.writes[0]).toMatch(/; Secure$/);
      } finally {
        jsdom.reconfigure({ url: original });
      }
    });
  });

  describe('subscribe', () => {
    it('stops notifying after unsubscribe', () => {
      const store = getBsThemeStore();
      const listener = vi.fn();
      const unsubscribe = store.subscribe(listener);
      store.setMode('dark');
      unsubscribe();
      store.setMode('light');
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('cross-tab sync (BroadcastChannel)', () => {
    it('tells other tabs about a local setMode', async () => {
      const store = getBsThemeStore();
      const otherTab = peer();
      const received = nextMessage(otherTab);
      store.setMode('dark');
      expect(await received).toBe('dark');
    });

    it('applies a mode from another tab without echoing it or writing the cookie', async () => {
      const store = getBsThemeStore();
      const listener = vi.fn();
      store.subscribe(listener);
      const otherTab = peer();

      otherTab.postMessage('dark');
      await vi.waitFor(() => expect(store.getMode()).toBe('dark'));
      expect(themeAttr()).toBe('dark');
      expect(listener).toHaveBeenCalledTimes(1);
      expect(cookie.writes).toEqual([]);

      // No echo: nothing comes back on the channel.
      expect(await nextMessage(otherTab)).toBeUndefined();
    });

    it('ignores an invalid mode from another tab', async () => {
      const store = getBsThemeStore();
      const otherTab = peer();
      otherTab.postMessage('x"><script>');
      otherTab.postMessage({ mode: 'dark' });
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(store.getMode()).toBe('auto');
      expect(themeAttr()).toBe('light');
    });
  });

  describe('singleton', () => {
    it('is one instance per document, registered on the global symbol', () => {
      const store = getBsThemeStore();
      expect(getBsThemeStore()).toBe(store);
      expect((globalThis as Record<symbol, unknown>)[Symbol.for('mintplayer.bs-theme')]).toBe(store);
    });

    it('is replaced by a fresh instance after the test reset', () => {
      const first = getBsThemeStore();
      __resetBsThemeStoreForTests();
      expect((globalThis as Record<symbol, unknown>)[Symbol.for('mintplayer.bs-theme')]).toBeUndefined();
      expect(getBsThemeStore()).not.toBe(first);
    });

    it('releases the matchMedia listener and the channel on reset', async () => {
      const store = getBsThemeStore();
      __resetBsThemeStoreForTests();
      expect(media.listenerCount()).toBe(0);

      const otherTab = peer();
      otherTab.postMessage('dark');
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(store.getMode()).toBe('auto');
    });
  });
});
