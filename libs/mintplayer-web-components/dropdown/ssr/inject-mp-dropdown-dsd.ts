import { MP_DROPDOWN_DSD_CHROME } from './mp-dropdown-chrome.generated';

/**
 * Injects `<mp-dropdown>`'s static Declarative Shadow DOM chrome into
 * server-rendered HTML so the dropdown renders and toggles (native `<details>`)
 * with JavaScript disabled. Call it on the HTML string the framework produces
 * before sending the response — the framework-agnostic counterpart to
 * `injectMpShellDsd`, shared by all three SSR servers.
 *
 * The chrome is static (independent of the slotted trigger/items), so this is a
 * constant insertion after each `<mp-dropdown>` open tag — including nested
 * dropdowns, whose tags also match (recursive DSD attaches at parse time). The
 * negative lookahead skips any tag already followed by a `<template …
 * shadowrootmode>`, so re-running is a no-op and it won't be tripped by some
 * other element's DSD.
 */
export function injectMpDropdownDsd(html: string): string {
  if (!html.includes('<mp-dropdown')) {
    return html;
  }
  return html.replace(
    /(<mp-dropdown\b[^>]*>)(?!\s*<template\b[^>]*shadowrootmode)/g,
    (tag) => `${tag}${MP_DROPDOWN_DSD_CHROME}`,
  );
}
