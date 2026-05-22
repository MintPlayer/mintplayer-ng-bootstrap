import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { computed, DestroyRef, effect, inject, Injectable, PLATFORM_ID, signal, type Signal } from '@angular/core';
import { BS_THEME_STORAGE_KEY, type BsEffectiveThemeMode, type BsThemeMode } from './bs-theme-mode';
/**
 * Owns the user's Bootstrap color-mode choice and keeps `<html data-bs-theme>`
 * in sync with it.
 *
 * - `mode` is the *authored* value (`'auto' | 'light' | 'dark' | custom`).
 * - `effectiveMode` is the *resolved* value — `'auto'` resolves via
 *   `matchMedia('(prefers-color-scheme: dark)')`, explicit values pass through.
 * - `setMode()` is the only writer. Both signals are read-only views.
 *
 * Switching strategy: Bootstrap 5.3+ ships a full `[data-bs-theme="dark"]` block
 * in its SCSS. Flipping the attribute on `<html>` swaps the entire palette in
 * one DOM write. We deliberately do NOT mutate individual `--bs-*` custom
 * properties — that primitive is documented for runtime *customization* (brand
 * colors, end-user theming), not for the light/dark switch.
 *
 * SSR: on the server we skip `localStorage`, `matchMedia`, and the DOM-write
 * effect. Server-rendered HTML therefore has no `data-bs-theme` attribute. The
 * documented inline pre-boot `<script>` writes it client-side before any CSS
 * link evaluates, preventing a light-mode flash for dark-mode users.
 *
 * Usage:
 *   ```ts
 *   const theme = inject(BsThemeService);
 *   theme.setMode('dark');       // explicit
 *   theme.setMode('auto');       // follow system
 *   theme.setMode('sepia');      // custom variant — consumer ships matching CSS
 *   theme.mode();                // → 'sepia'
 *   theme.effectiveMode();       // → 'sepia' (auto would resolve to 'light'|'dark')
 *   ```
 */
@Injectable({ providedIn: 'root' })
export class BsThemeService {
  private readonly platformId = inject(PLATFORM_ID);

  private readonly _mode = signal<BsThemeMode>('auto');
  private readonly _prefersDark = signal(false);

  /** The mode the user picked. Use `setMode()` to change. */
  readonly mode: Signal<BsThemeMode> = this._mode.asReadonly();

  /**
   * The mode that's actually applied. `'auto'` is resolved via
   * `prefers-color-scheme`; everything else passes through unchanged.
   */
  readonly effectiveMode: Signal<BsEffectiveThemeMode> = computed(() => {
    const m = this._mode();
    if (m === 'auto') return this._prefersDark() ? 'dark' : 'light';
    return m;
  });

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      // Defer DestroyRef + DOCUMENT injections to inside the platform check —
      // pulling them at the field-init level meant the SSR injector resolved
      // tokens whose destroy-time callbacks fire during ApplicationRef
      // teardown and surface as NG0953 ("Unexpected emit for destroyed
      // OutputRef") on the dev server.
      const destroyRef = inject(DestroyRef);
      const document = inject(DOCUMENT);

      // Hydrate initial mode from localStorage. Wrapped because privacy modes
      // or sandboxed iframes can throw on access.
      try {
        const stored = localStorage.getItem(BS_THEME_STORAGE_KEY);
        if (stored) this._mode.set(stored);
      } catch {
        // localStorage unavailable — stick with the 'auto' default.
      }

      if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
        const mql = window.matchMedia('(prefers-color-scheme: dark)');
        this._prefersDark.set(mql.matches);
        const listener = (e: MediaQueryListEvent) => this._prefersDark.set(e.matches);
        mql.addEventListener('change', listener);
        destroyRef.onDestroy(() => mql.removeEventListener('change', listener));
      }

      // Keep <html data-bs-theme> in sync with the resolved mode.
      effect(() => {
        const resolved = this.effectiveMode();
        document.documentElement.setAttribute('data-bs-theme', resolved);
      });
    }
  }

  /**
   * Set the user's mode. Persists to localStorage and updates the DOM attribute.
   * Accepts any string for custom variants — consumer is responsible for
   * shipping a matching `[data-bs-theme="<value>"] { … }` rule.
   */
  setMode(mode: BsThemeMode): void {
    this._mode.set(mode);
    if (isPlatformBrowser(this.platformId)) {
      try {
        localStorage.setItem(BS_THEME_STORAGE_KEY, mode);
      } catch {
        // localStorage unavailable — state is in-memory only.
      }
    }
  }
}
