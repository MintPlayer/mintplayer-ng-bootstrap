/**
 * Entry of the GENERATED `theming/bs-theme-preboot.js` (PRD dark-mode D5):
 * bundled by tools/scripts/build-theme-preboot.mjs into a minified ES5 IIFE
 * that consumers load with a blocking `<script src>` in `<head>`, after the
 * `bs-theme-default-mode` meta and before the stylesheets.
 *
 * Same precedence as the store: a valid cookie, then the meta default, then
 * `auto` resolved against `prefers-color-scheme`. Everything it imports must
 * stay side-effect-free and ES5-runtime-only (see `cookie.ts`). Not exported
 * from the barrel.
 */
import { readThemeCookie } from './cookie';
import { readDefaultModeMeta, resolveMode } from './resolve';

try {
  const doc = document;
  const mode = readThemeCookie(doc.cookie) || readDefaultModeMeta(doc) || 'auto';
  const prefersDark = !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  doc.documentElement.setAttribute('data-bs-theme', resolveMode(mode, prefersDark));
} catch {
  // Never block the page: without the attribute, Bootstrap's light tokens apply.
}
