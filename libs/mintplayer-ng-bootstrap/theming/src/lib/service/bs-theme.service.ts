import { DOCUMENT, isPlatformBrowser, isPlatformServer } from '@angular/common';
import {
  DestroyRef,
  inject,
  Injectable,
  PLATFORM_ID,
  REQUEST,
  signal,
  type Signal,
} from '@angular/core';
import {
  getBsThemeStore,
  readDefaultModeMeta,
  resolveServerTheme,
  type BsEffectiveThemeMode,
  type BsThemeMode,
} from '@mintplayer/web-components/theming';

/**
 * Angular's view of the document's Bootstrap colour mode (PRD dark-mode D4).
 *
 * - `mode` is the *authored* value (`'auto' | 'light' | 'dark' | custom`).
 * - `effectiveMode` is the value on `<html data-bs-theme>`: `'auto'` resolved
 *   against `prefers-color-scheme`, everything else passed through.
 * - `setMode()` changes it. Both signals are read-only views.
 *
 * **This service is a pure mirror of the framework-neutral store.** In the
 * browser it holds no state of its own: `mode`/`effectiveMode` are refreshed
 * from `getBsThemeStore().subscribe()`, and `setMode()` forwards to the store's
 * `setMode()` (libs/mintplayer-web-components/theming/src/store.ts), which owns
 * validation, the `bs-theme-mode` cookie, the `data-bs-theme` write, the
 * `prefers-color-scheme` listener and cross-tab sync. So a change made anywhere
 * else (`<mp-theme-toggle>`, another tab, the OS) reaches these signals, and a
 * copy here could never drift. Any behaviour added to the store's `setMode()`
 * must be reflected here, and vice versa; the mirror tests in
 * bs-theme.service.spec.ts pin it.
 *
 * **Server:** Angular SSR creates a root injector per request, which is the one
 * thing the store cannot do (it is a document singleton and never exists on a
 * server). The service resolves the request's `bs-theme-mode` cookie against the
 * page's `<meta name="bs-theme-default-mode">` with `resolveServerTheme()`,
 * seeds the signals and, for an explicit mode, writes `data-bs-theme` on the
 * server `<html>` synchronously in the constructor, so the first byte of HTML is
 * already themed. Hydration never touches `<html>`, and the browser branch never
 * writes anything itself, so the server's attribute survives client boot.
 * `REQUEST` is `null` during prerender and route extraction: that is treated as
 * "no cookie", and the pre-boot script themes those pages on the client.
 *
 * Usage:
 *   ```ts
 *   const theme = inject(BsThemeService);
 *   theme.setMode('dark');       // explicit
 *   theme.setMode('auto');       // follow the OS
 *   theme.setMode('sepia');      // custom variant: ship a matching [data-bs-theme=sepia] block
 *   theme.mode();                // 'sepia'
 *   theme.effectiveMode();       // 'sepia' (auto would resolve to 'light' | 'dark')
 *   ```
 */
@Injectable({ providedIn: 'root' })
export class BsThemeService {
  private readonly platformId = inject(PLATFORM_ID);

  private readonly _mode = signal<BsThemeMode>('auto');
  private readonly _effectiveMode = signal<BsEffectiveThemeMode>('light');

  /** The mode the user picked. Use `setMode()` to change it. */
  readonly mode: Signal<BsThemeMode> = this._mode.asReadonly();

  /** The mode applied to `<html data-bs-theme>`. */
  readonly effectiveMode: Signal<BsEffectiveThemeMode> = this._effectiveMode.asReadonly();

  constructor() {
    // REQUEST, DOCUMENT and DestroyRef are injected INSIDE the platform checks,
    // never at field level: pulling them for every platform meant the SSR
    // injector resolved tokens whose destroy-time callbacks fire during
    // ApplicationRef teardown and surface as NG0953 ("Unexpected emit for
    // destroyed OutputRef") on the dev server.
    if (isPlatformServer(this.platformId)) {
      const request = inject(REQUEST);
      const document = inject(DOCUMENT);
      const resolved = resolveServerTheme(request?.headers.get('cookie') ?? null, {
        defaultMode: readDefaultModeMeta(document),
      });
      if (resolved !== null) {
        this._mode.set(resolved);
        this._effectiveMode.set(resolved);
        // resolveServerTheme only returns values that pass isValidThemeMode.
        document.documentElement.setAttribute('data-bs-theme', resolved);
      }
      return;
    }

    if (isPlatformBrowser(this.platformId)) {
      const destroyRef = inject(DestroyRef);
      const store = getBsThemeStore();
      const sync = () => {
        this._mode.set(store.getMode());
        this._effectiveMode.set(store.effectiveMode());
      };
      sync();
      destroyRef.onDestroy(store.subscribe(sync));
    }
  }

  /**
   * Set the user's mode. Forwards to the store's `setMode()`
   * (libs/mintplayer-web-components/theming/src/store.ts): an invalid mode is a
   * no-op with a warning, a valid one is persisted to the cookie and applied to
   * `<html>`, and the signals update through the store subscription. Custom
   * variants need a matching `[data-bs-theme="<value>"] { ... }` rule.
   * A no-op on the server, where a mode comes only from the request cookie.
   */
  setMode(mode: BsThemeMode): void {
    if (!isPlatformBrowser(this.platformId)) return;
    getBsThemeStore().setMode(mode);
  }
}
