/**
 * Theme cookie contract (PRD dark-mode D3). Pure and SSR-safe: nothing here
 * touches `window` or `document` at module level.
 *
 * This module is bundled into the GENERATED `bs-theme-preboot.js` (ES5 IIFE),
 * so it may only use ES5 runtime APIs: no `Array.prototype.find` / `includes`,
 * no `String.prototype.startsWith`, no `Object.assign`. The build's acorn check
 * catches ES2015+ syntax, not ES2015+ runtime calls.
 */

/** Name of the cookie that persists the user's chosen theme mode. */
export const BS_THEME_COOKIE_NAME = 'bs-theme-mode';

/**
 * SECURITY INVARIANT: this pattern is what makes it safe to splice a mode into
 * markup unescaped (`resolveServerTheme` → `injectThemeAttribute`, and the
 * Angular server `setAttribute`). A value that passes it can contain no quote,
 * angle bracket, whitespace or `=`. Never widen it without escaping every
 * consumer; `resolve.spec.ts` pins it by name.
 */
const THEME_MODE_PATTERN = /^[a-z0-9-]{1,32}$/i;

/** One year, in seconds. */
const MAX_AGE = 31536000;

/** True when `value` is a syntactically valid theme mode (see the security invariant above). */
export function isValidThemeMode(value: unknown): value is string {
  return typeof value === 'string' && THEME_MODE_PATTERN.test(value);
}

function decode(raw: string): string | null {
  try {
    return decodeURIComponent(raw);
  } catch {
    return null;
  }
}

/**
 * Read the theme mode from a `Cookie` header or `document.cookie` string.
 * Takes the FIRST `bs-theme-mode=` pair only; an undecodable or invalid value
 * counts as absent (`null`). The result is lower-cased.
 */
export function readThemeCookie(cookieString: string | null | undefined): string | null {
  if (!cookieString) return null;
  const prefix = BS_THEME_COOKIE_NAME + '=';
  const pairs = cookieString
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part.slice(0, prefix.length) === prefix);
  if (pairs.length === 0) return null;
  const value = decode(unquote(pairs[0].slice(prefix.length).trim()));
  return isValidThemeMode(value) ? value.toLowerCase() : null;
}

/** RFC 6265 allows a cookie value wrapped in double quotes; strip one pair. */
function unquote(raw: string): string {
  return raw.length > 1 && raw.charAt(0) === '"' && raw.charAt(raw.length - 1) === '"'
    ? raw.slice(1, -1)
    : raw;
}

export interface WriteThemeCookieOptions {
  /** Passed through verbatim as `Domain=`; never derived. Omitted when not given. */
  cookieDomain?: string;
  /** Adds `Secure`; set it only when the page is served over `https:`. */
  secure: boolean;
}

/**
 * Persist `mode` in the theme cookie: `Path=/`, `SameSite=Lax`, one year,
 * not HttpOnly (the pre-boot script and the store read it). An invalid mode is
 * ignored. `doc` defaults to the global `document`; with neither, it is a no-op.
 */
export function writeThemeCookie(mode: string, opts: WriteThemeCookieOptions, doc?: Document): void {
  if (!isValidThemeMode(mode)) return;
  const target = doc || (typeof document !== 'undefined' ? document : undefined);
  if (!target) return;
  const parts = [
    BS_THEME_COOKIE_NAME + '=' + encodeURIComponent(mode.toLowerCase()),
    'Path=/',
    'SameSite=Lax',
    'Max-Age=' + MAX_AGE,
  ];
  if (opts.cookieDomain) {
    // A host-only cookie from before cookieDomain was configured would shadow
    // the Domain cookie: readThemeCookie takes the first pair, and browsers
    // list the older cookie first. Expire it (a delete without Domain= only
    // matches the host-only cookie) before writing the shared one.
    target.cookie = BS_THEME_COOKIE_NAME + '=; Path=/; Max-Age=0';
    parts.push('Domain=' + opts.cookieDomain);
  }
  if (opts.secure) parts.push('Secure');
  target.cookie = parts.join('; ');
}
