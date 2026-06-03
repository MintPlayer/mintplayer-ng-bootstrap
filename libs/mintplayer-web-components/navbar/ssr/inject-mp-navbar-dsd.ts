import {
  MP_NAVBAR_DSD_CHROME,
  MP_NAVBAR_ITEM_DSD_CHROME,
  MP_NAVBAR_BRAND_DSD_CHROME,
  MP_NAVBAR_DROPDOWN_DSD_CHROME,
} from './mp-navbar-chrome.generated';

const CHROME: ReadonlyArray<readonly [tag: string, chrome: string]> = [
  ['mp-navbar', MP_NAVBAR_DSD_CHROME],
  ['mp-navbar-item', MP_NAVBAR_ITEM_DSD_CHROME],
  ['mp-navbar-brand', MP_NAVBAR_BRAND_DSD_CHROME],
  ['mp-navbar-dropdown', MP_NAVBAR_DROPDOWN_DSD_CHROME],
];

/**
 * Injects the navbar WCs' static Declarative Shadow DOM chrome into
 * server-rendered HTML so the navbar renders — and collapses/reveals via its
 * pure-CSS state machine — with JavaScript disabled. Call it in your SSR server
 * on the HTML string the framework produces, before sending the response.
 *
 * Each element's chrome is static (independent of slotted content), so this is a
 * targeted constant insertion after each matching open tag. The browser parser
 * consumes each `<template shadowrootmode>` into the element's shadow root;
 * light-DOM (slotted) children — brand text, nav links, dropdown menus — are
 * untouched, so it is safe with hydration.
 *
 * Idempotent per element via the negative lookahead. Anchored with a `\b`-style
 * boundary (`[\\s>]`) so `<mp-navbar` does NOT also match `<mp-navbar-item>` etc.
 */
export function injectMpNavbarDsd(html: string): string {
  if (!html.includes('<mp-navbar')) {
    return html;
  }
  return CHROME.reduce((acc, [tag, chrome]) => {
    // `(?=[\\s>/])` ensures `mp-navbar` doesn't match the `mp-navbar-item` prefix.
    const re = new RegExp(`(<${tag}(?=[\\s>/])[^>]*>)(?!\\s*<template\\b[^>]*shadowrootmode)`, 'g');
    return acc.replace(re, (openTag) => `${openTag}${chrome}`);
  }, html);
}
