/**
 * Theme-mode resolution (PRD dark-mode D3, D5b). Pure and SSR-safe.
 *
 * Bundled into the GENERATED `bs-theme-preboot.js` (ES5 IIFE): ES5 runtime
 * APIs only, see the note in `cookie.ts`.
 */
import { isValidThemeMode, readThemeCookie } from './cookie';

/** `<meta name="bs-theme-default-mode" content="dark">` declares the site's default mode (D5b). */
export const BS_THEME_DEFAULT_MODE_META = 'bs-theme-default-mode';

/** The mode a user picked: `auto` follows `prefers-color-scheme`; any other valid mode is a custom theme. */
export type BsThemeMode = 'auto' | 'light' | 'dark' | (string & {});

/** The mode actually applied to `<html data-bs-theme>`: never `auto`. */
export type BsEffectiveThemeMode = 'light' | 'dark' | (string & {});

/** Resolve `auto` against the OS preference; every other mode passes through. */
export function resolveMode(mode: BsThemeMode, prefersDark: boolean): BsEffectiveThemeMode {
  if (mode === 'auto') return prefersDark ? 'dark' : 'light';
  return mode;
}

/**
 * Read the declared default mode from `<meta name="bs-theme-default-mode">`.
 * Absent or invalid → `null`. The result is lower-cased.
 */
export function readDefaultModeMeta(doc: Document): string | null {
  if (!doc || typeof doc.querySelector !== 'function') return null;
  const meta = doc.querySelector('meta[name="' + BS_THEME_DEFAULT_MODE_META + '"]');
  const content = meta ? meta.getAttribute('content') : null;
  return isValidThemeMode(content) ? content.toLowerCase() : null;
}

export interface ResolveServerThemeOptions {
  /** The value of the `bs-theme-default-mode` meta, if the page declares one. */
  defaultMode?: string | null;
}

/**
 * The `data-bs-theme` value a server should render, or `null` for `auto`
 * (render no attribute; the pre-boot script resolves it on the client).
 *
 * Precedence: a valid cookie wins, including a valid `auto` cookie over a
 * non-auto default (the user's explicit choice beats the site default); then
 * a valid `defaultMode`; then `auto`. An invalid cookie counts as absent.
 *
 * The result always satisfies the `isValidThemeMode` SECURITY INVARIANT, so it
 * is safe to splice into markup.
 */
export function resolveServerTheme(
  cookieHeader: string | null | undefined,
  opts?: ResolveServerThemeOptions,
): string | null {
  const fromCookie = readThemeCookie(cookieHeader);
  const declared = opts && isValidThemeMode(opts.defaultMode) ? opts.defaultMode.toLowerCase() : null;
  const mode = fromCookie || declared || 'auto';
  return mode === 'auto' ? null : mode;
}

const HTML_OPEN_TAG = /<html(?=[\s>])([^>]*)>/i;
const THEME_ATTRIBUTE = /\sdata-bs-theme(?![\w-])(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'>]+))?/gi;

/**
 * Set `data-bs-theme="<mode>"` on the document's `<html ...>` open tag,
 * keeping every other attribute (`lang`, `dir`, ...). Idempotent: an existing
 * `data-bs-theme` is replaced, never duplicated. `null` (auto) or an invalid
 * mode returns the markup unchanged; so does markup with no `<html>` tag.
 */
export function injectThemeAttribute(html: string, mode: string | null): string {
  if (mode === null || !isValidThemeMode(mode)) return html;
  const value = mode.toLowerCase();
  return html.replace(HTML_OPEN_TAG, (_tag, attrs: string) => {
    const kept = attrs.replace(THEME_ATTRIBUTE, '').replace(/\s+$/, '');
    return '<html' + kept + ' data-bs-theme="' + value + '">';
  });
}
