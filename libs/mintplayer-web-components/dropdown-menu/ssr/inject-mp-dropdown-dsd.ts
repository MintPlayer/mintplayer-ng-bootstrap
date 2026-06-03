import {
  MP_DROPDOWN_MENU_DSD_CHROME,
  MP_DROPDOWN_ITEM_DSD_CHROME,
  MP_DROPDOWN_DIVIDER_DSD_CHROME,
  MP_DROPDOWN_HEADER_DSD_CHROME,
} from './mp-dropdown-chrome.generated';

// Each dropdown element renders its own static shadow chrome, so every tag in
// the family needs its own DSD `<template>` injected.
const CHROME: ReadonlyArray<readonly [tag: string, chrome: string]> = [
  ['mp-dropdown-menu', MP_DROPDOWN_MENU_DSD_CHROME],
  ['mp-dropdown-item', MP_DROPDOWN_ITEM_DSD_CHROME],
  ['mp-dropdown-divider', MP_DROPDOWN_DIVIDER_DSD_CHROME],
  ['mp-dropdown-header', MP_DROPDOWN_HEADER_DSD_CHROME],
];

/**
 * Injects the dropdown WCs' static Declarative Shadow DOM chrome into
 * server-rendered HTML so the menu, items, dividers and headers render with
 * JavaScript disabled. Call it in your SSR server on the HTML string the
 * framework produces, before sending the response.
 *
 * Each element's chrome is static (independent of slotted content), so this is
 * a targeted constant insertion after each matching open tag — not an HTML
 * rewriter. The browser parser consumes each injected `<template shadowrootmode>`
 * into the element's shadow root; light-DOM (slotted) children are untouched, so
 * it is safe with hydration.
 *
 * Idempotent *per element*: the negative lookahead skips any tag already
 * followed by a `<template … shadowrootmode>`, so re-running is a no-op without
 * relying on a page-global `shadowrootmode` check (which any *other* DSD-emitting
 * component would also trip).
 */
export function injectMpDropdownDsd(html: string): string {
  if (!html.includes('<mp-dropdown-')) {
    return html;
  }
  return CHROME.reduce((acc, [tag, chrome]) => {
    const re = new RegExp(`(<${tag}\\b[^>]*>)(?!\\s*<template\\b[^>]*shadowrootmode)`, 'g');
    return acc.replace(re, (openTag) => `${openTag}${chrome}`);
  }, html);
}
