/**
 * The browser-side theme store (PRD dark-mode D2, D3). One instance per
 * document, shared by every copy of this module on the page through
 * `globalThis[Symbol.for('mintplayer.bs-theme')]`.
 *
 * It is created lazily on first browser access and never exists on a server:
 * a module-level singleton would leak one request's theme into the next. On
 * the server use the pure helpers (`resolveServerTheme`, `injectThemeAttribute`).
 *
 * The store owns every invariant: validation, the cookie write, the
 * `<html data-bs-theme>` write, the single `prefers-color-scheme` listener,
 * and cross-tab sync over `BroadcastChannel('bs-theme-mode')`. A mode received
 * from another tab is applied without being posted or written back, so there
 * is no echo.
 *
 * The registered object's shape is a compatibility surface: two library
 * versions on one page share whichever instance registered first, so members
 * may be added but never removed or changed.
 */
import { BS_THEME_COOKIE_NAME, isValidThemeMode, readThemeCookie, writeThemeCookie } from './cookie';
import { type BsEffectiveThemeMode, type BsThemeMode, readDefaultModeMeta, resolveMode } from './resolve';

export interface BsThemeStore {
  /** The mode the user picked (`auto`, `light`, `dark` or a custom mode). */
  getMode(): BsThemeMode;
  /** The mode applied to `<html data-bs-theme>`: `auto` resolved against the OS preference. */
  effectiveMode(): BsEffectiveThemeMode;
  /** Set, persist and apply a mode. An invalid mode is a no-op with a warning. */
  setMode(mode: BsThemeMode): void;
  /** Called after every change of `getMode()` or `effectiveMode()`. Returns the unsubscribe. */
  subscribe(listener: () => void): () => void;
}

export interface BsThemeConfig {
  /** Passed through verbatim as the cookie's `Domain=`; never derived. */
  cookieDomain?: string;
}

/** The registered instance: the public store plus the members its own module needs. */
interface RegisteredBsThemeStore extends BsThemeStore {
  configure(config: BsThemeConfig): void;
  dispose(): void;
}

const STORE_KEY = Symbol.for('mintplayer.bs-theme');
const CHANNEL_NAME = BS_THEME_COOKIE_NAME;
const PREFERS_DARK = '(prefers-color-scheme: dark)';

type StoreHost = { [STORE_KEY]?: RegisteredBsThemeStore };

const host = (): StoreHost => globalThis as unknown as StoreHost;

function hasBrowserDocument(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined' && !!document.documentElement;
}

function warnInvalid(mode: unknown): void {
  // eslint-disable-next-line no-console
  console.warn(
    `[bs-theme] setMode(${JSON.stringify(mode)}) ignored: a mode must match /^[a-z0-9-]{1,32}$/i.`,
  );
}

function createStore(): RegisteredBsThemeStore {
  const listeners = new Set<() => void>();
  let config: BsThemeConfig = {};
  let mode: BsThemeMode = readThemeCookie(document.cookie) ?? readDefaultModeMeta(document) ?? 'auto';

  const mql = typeof window.matchMedia === 'function' ? window.matchMedia(PREFERS_DARK) : null;
  let prefersDark = mql?.matches ?? false;

  const effective = () => resolveMode(mode, prefersDark);
  const applyAttribute = () => document.documentElement.setAttribute('data-bs-theme', effective());
  // Isolate listeners: one that throws must not starve the others. The error is
  // rethrown asynchronously so it still surfaces in the console / error handler.
  const notify = () =>
    [...listeners].map((listener) => {
      try {
        listener();
      } catch (error) {
        setTimeout(() => {
          throw error;
        });
      }
    });

  const onSchemeChange = (event: MediaQueryListEvent) => {
    const before = effective();
    prefersDark = event.matches;
    if (effective() === before) return;
    applyAttribute();
    notify();
  };
  mql?.addEventListener('change', onSchemeChange);

  const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel(CHANNEL_NAME) : null;
  if (channel) {
    // A received mode is applied only: no post, no cookie write (the sender wrote it), hence no echo.
    channel.onmessage = (event: MessageEvent) => {
      const received = event.data;
      if (!isValidThemeMode(received) || received.toLowerCase() === mode) return;
      mode = received.toLowerCase();
      applyAttribute();
      notify();
    };
  }

  applyAttribute();

  return {
    getMode: () => mode,
    effectiveMode: effective,
    /**
     * Set the user's mode: validate, persist to the `bs-theme-mode` cookie
     * (renewed on every call, `Secure` on `https:`), write
     * `<html data-bs-theme>`, notify subscribers and tell the other tabs.
     *
     * BsThemeService (libs/mintplayer-ng-bootstrap/theming) is a pure mirror of
     * this store; any behaviour change here must be reflected there; pinned by
     * bs-theme.service.spec.ts mirror tests.
     */
    setMode(next: BsThemeMode) {
      if (!isValidThemeMode(next)) {
        warnInvalid(next);
        return;
      }
      const normalized = next.toLowerCase();
      writeThemeCookie(normalized, {
        cookieDomain: config.cookieDomain,
        secure: location.protocol === 'https:',
      });
      if (normalized === mode) return;
      mode = normalized;
      applyAttribute();
      notify();
      channel?.postMessage(normalized);
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    configure(next: BsThemeConfig) {
      config = { ...config, ...next };
    },
    dispose() {
      mql?.removeEventListener('change', onSchemeChange);
      channel?.close();
      listeners.clear();
    },
  };
}

function registeredStore(): RegisteredBsThemeStore {
  if (!hasBrowserDocument()) {
    throw new Error(
      '[bs-theme] getBsThemeStore() is browser-only. On a server, use resolveServerTheme() and injectThemeAttribute().',
    );
  }
  const globalHost = host();
  return (globalHost[STORE_KEY] ??= createStore());
}

/**
 * The document's theme store, created on first call. Browser-only: throws when
 * there is no `window`/`document` (guard with a platform check on the server).
 */
export function getBsThemeStore(): BsThemeStore {
  return registeredStore();
}

/**
 * Configure the store (the only runtime option is `cookieDomain`). A no-op on
 * the server, where no store exists.
 */
export function configureBsTheme(opts: BsThemeConfig): void {
  if (!hasBrowserDocument()) return;
  registeredStore().configure(opts);
}

/** Test-only: dispose the singleton (closing its BroadcastChannel) so the next access creates a fresh one. */
export function __resetBsThemeStoreForTests(): void {
  const globalHost = host();
  globalHost[STORE_KEY]?.dispose();
  delete globalHost[STORE_KEY];
}
