import { MP_DROPDOWN_MENU_DSD_CHROME } from './mp-dropdown-chrome.generated';

/**
 * Injects `<mp-dropdown-menu>`'s static Declarative Shadow DOM chrome into
 * server-rendered HTML so the menu renders (bordered panel + item/divider/header
 * `::slotted` styling) with JavaScript disabled. Call it in your SSR server on
 * the HTML string the framework produces, before sending the response.
 *
 * Only `<mp-dropdown-menu>` has a shadow root; its items/dividers/headers are
 * plain light-DOM elements, so there is nothing to inject for them. The chrome
 * is static (independent of slotted content), so this is a targeted constant
 * insertion after each `<mp-dropdown-menu>` open tag — not an HTML rewriter. The
 * browser parser consumes the injected `<template shadowrootmode>` into the
 * shadow root; light-DOM (slotted) children are untouched, so it is
 * hydration-safe.
 *
 * Idempotent: the negative lookahead skips any tag already followed by a
 * `<template … shadowrootmode>`, so re-running is a no-op without relying on a
 * page-global `shadowrootmode` check (which any *other* DSD-emitting component
 * would also trip).
 */
export function injectMpDropdownDsd(html: string): string {
  if (!html.includes('<mp-dropdown-menu')) {
    return html;
  }
  const re = /(<mp-dropdown-menu\b[^>]*>)(?!\s*<template\b[^>]*shadowrootmode)/g;
  return html.replace(re, (openTag) => `${openTag}${MP_DROPDOWN_MENU_DSD_CHROME}`);
}
