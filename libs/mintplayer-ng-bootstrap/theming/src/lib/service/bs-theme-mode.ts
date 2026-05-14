/**
 * Authored mode the user picked.
 *
 * - `'auto'` resolves at runtime via `matchMedia('(prefers-color-scheme: dark)')`.
 * - `'light'` / `'dark'` map directly to Bootstrap's native `data-bs-theme` values.
 * - Any other string (`(string & {})`) is accepted for custom variants — the consumer
 *   is expected to ship a matching `[data-bs-theme="…"] { … }` block in their styles.
 *   The `(string & {})` trick preserves autocomplete for the known literals while
 *   still admitting arbitrary strings without a cast.
 */
export type BsThemeMode = 'auto' | 'light' | 'dark' | (string & {});

/**
 * Mode after `'auto'` has been resolved. `'light'` / `'dark'` are the only values
 * `prefers-color-scheme` ever produces; explicit custom variants pass through.
 */
export type BsEffectiveThemeMode = 'light' | 'dark' | (string & {});

/**
 * localStorage key used by `BsThemeService` AND the inline pre-boot `<script>`
 * documented for SSR-safe no-flash integration. The two must stay in sync; the
 * key value is duplicated in the script snippet because the script runs before
 * any module loads. See `/additional-samples/theming` for the recipe.
 */
export const BS_THEME_STORAGE_KEY = 'bs-theme-mode';
