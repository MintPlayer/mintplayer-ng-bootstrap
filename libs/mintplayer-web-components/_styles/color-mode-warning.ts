/**
 * One-time developer warning for a missing `--mp-color-mode` token.
 *
 * The dark icons inside component sheets (the `mp-select` caret, the
 * query-condition select caret, the `mp-checkbox` switch knob) switch through
 * `@container style(--mp-color-mode: dark)`. That token is declared by
 * `@mintplayer/web-components/theming/color-mode.css`, which the Angular
 * `_bootstrap.scss` pulls in automatically, but a React/Vue page that loads
 * stock `bootstrap.min.css` must import it itself. Without it every icon stays
 * light-mode in dark mode and nothing reports why, so the first component that
 * relies on the token checks for it once per page.
 *
 * Cheap by construction: one flag read per connect, and at most one
 * `getComputedStyle` call per page (deferred to `load` while the document is
 * still loading, so a stylesheet that is still in flight is not reported).
 */

const WARNED = Symbol.for('mintplayer.color-mode-warning');

type WarnFlagHolder = { [WARNED]?: true };

function check(): void {
  const value = getComputedStyle(document.documentElement).getPropertyValue('--mp-color-mode').trim();
  if (value === '') {
    console.warn(
      '[@mintplayer/web-components] The --mp-color-mode token is not set on <html>, so component icons will not ' +
        'follow dark mode. Import "@mintplayer/web-components/theming/color-mode.css" next to your Bootstrap CSS ' +
        '(custom themes declare --mp-color-mode: light|dark themselves).',
    );
  }
}

export function warnIfColorModeTokenMissing(): void {
  const holder = globalThis as WarnFlagHolder;
  if (holder[WARNED]) return;
  // SSR guard: Angular's SSR DOM shim provides a document with no usable head.
  if (typeof document === 'undefined' || !document.head || typeof getComputedStyle !== 'function') return;
  // jsdom loads no stylesheets, so the token is always absent there.
  if (typeof navigator !== 'undefined' && navigator.userAgent.includes('jsdom')) return;
  holder[WARNED] = true;
  if (document.readyState === 'complete') {
    check();
  } else {
    window.addEventListener('load', check, { once: true });
  }
}
