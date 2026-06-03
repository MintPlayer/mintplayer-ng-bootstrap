import { MP_SHELL_DSD_CHROME } from './mp-shell-chrome.generated';

/**
 * Injects `<mp-shell>`'s static Declarative Shadow DOM chrome into
 * server-rendered HTML so the component renders and toggles with JavaScript
 * disabled. Call it in your SSR server on the HTML string the framework
 * produces, before sending the response.
 *
 * The chrome is static (independent of slotted content), so this is a targeted
 * constant insertion after each `<mp-shell>` open tag — not an HTML rewriter.
 * The browser parser consumes the injected `<template shadowrootmode>` into the
 * element's shadow root; the element's light-DOM (slotted) children are
 * untouched, so it is safe with destructive bootstrap and with hydration.
 *
 * Idempotent *per `<mp-shell>`*: the negative lookahead skips any tag already
 * followed by a `<template … shadowrootmode>`, so re-running is a no-op without
 * relying on a page-global `shadowrootmode` check (which would also be tripped
 * by any *other* component emitting DSD, silently skipping our injection).
 */
export function injectMpShellDsd(html: string): string {
  if (!html.includes('<mp-shell')) {
    return html;
  }
  return html.replace(
    /(<mp-shell\b[^>]*>)(?!\s*<template\b[^>]*shadowrootmode)/g,
    (tag) => `${tag}${MP_SHELL_DSD_CHROME}`,
  );
}
