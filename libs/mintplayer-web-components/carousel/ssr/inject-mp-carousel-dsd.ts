import { MP_CAROUSEL_DSD_CHROME_BY_COUNT } from './mp-carousel-chrome.generated';

/** HTML elements with no closing tag (the typical slide, <img>, is one). */
const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

/**
 * Attribute-value-safe tag pattern: quoted values may contain `>` (e.g.
 * aria-label="Next >"), so the attribute chunk is tokenised as quoted strings
 * or anything that is not a quote/`>` — never a bare `[^>]*`.
 */
const ATTRS = `(?:"[^"]*"|'[^']*'|[^"'>])*`;

/**
 * Count the immediate child ELEMENTS of an <mp-carousel> in serialized HTML,
 * starting just after its open tag — the slide count its DSD variant needs.
 * Depth-tracks every element (so a nested <mp-carousel> and its subtree count
 * as ONE child), treats void/self-closing tags as leaves, and excludes
 * `slot="play-pause"` children (they are controls, not slides — mirroring the
 * element's own slide collection).
 */
function countSlides(html: string, from: number): number {
  const tag = new RegExp(`<(\\/?)([a-zA-Z][a-zA-Z0-9-]*)(${ATTRS})>`, 'g');
  tag.lastIndex = from;
  let depth = 0;
  let count = 0;
  let m: RegExpExecArray | null;
  while ((m = tag.exec(html))) {
    const [, slash, rawName, attrs] = m;
    const name = rawName.toLowerCase();
    if (slash) {
      if (depth === 0) break; // the host's own </mp-carousel>
      depth--;
      continue;
    }
    const isVoid = VOID_ELEMENTS.has(name) || /\/\s*$/.test(attrs);
    if (depth === 0 && !/\bslot\s*=\s*(?:"play-pause"|'play-pause')/.test(attrs)) {
      count++;
    }
    if (!isVoid) depth++;
  }
  return count;
}

/** Stamp the APG region semantics connectedCallback would set — JS never runs here. */
function stampHostA11y(openTag: string): string {
  let result = openTag;
  if (!/\brole\s*=/.test(result)) {
    result = result.replace(/>$/, ' role="region">');
  }
  if (!/\baria-roledescription\s*=/.test(result)) {
    result = result.replace(/>$/, ' aria-roledescription="carousel">');
  }
  return result;
}

/**
 * Injects <mp-carousel>'s Declarative Shadow DOM chrome into server-rendered
 * HTML so the carousel renders — and navigates via its radio-driven pure-CSS
 * state machine (indicators, prev/next with wrap-around, radiogroup arrow
 * keys) — with JavaScript disabled. Call it in your SSR server on the HTML
 * string the framework produces, before sending the response.
 *
 * The chrome is count-dependent, so this counts each instance's light-DOM
 * child elements and picks the matching pre-rendered variant (all generated
 * from the element's own render(), the single source of truth). Instances
 * with more slides than variants exist for get the inert variant: styled and
 * visible, no state machine. Light-DOM children are untouched, so it is safe
 * with hydration; idempotent via the shadowrootmode lookahead.
 */
export function injectMpCarouselDsd(html: string): string {
  if (!html.includes('<mp-carousel')) {
    return html;
  }
  const open = new RegExp(`<mp-carousel(?=[\\s>/])(${ATTRS})>`, 'g');
  let result = '';
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = open.exec(html))) {
    const end = open.lastIndex;
    result += html.slice(last, m.index);
    last = end;
    if (/^\s*<template[^>]*shadowrootmode/.test(html.slice(end, end + 120))) {
      result += m[0]; // already has a DSD — leave untouched
      continue;
    }
    const count = countSlides(html, end);
    const chrome =
      count < MP_CAROUSEL_DSD_CHROME_BY_COUNT.length
        ? MP_CAROUSEL_DSD_CHROME_BY_COUNT[count]
        : MP_CAROUSEL_DSD_CHROME_BY_COUNT[0];
    result += stampHostA11y(m[0]) + chrome;
  }
  return result + html.slice(last);
}
