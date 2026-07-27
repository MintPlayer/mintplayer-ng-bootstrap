import {
  MP_ACCORDION_DSD_CHROME_BY_COUNT,
  MP_ACCORDION_MULTI_DSD_CHROME_BY_COUNT,
} from './mp-accordion-chrome.generated';

/**
 * Attribute-value-safe tag pattern: quoted values may contain `>`, so the
 * attribute chunk is tokenised as quoted strings or anything that is not a
 * quote/`>` — never a bare `[^>]*`.
 */
const ATTRS = `(?:"[^"]*"|'[^']*'|[^"'>])*`;

/** HTML elements with no closing tag. */
const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

/**
 * Count the tab markers of the `<mp-accordion>` whose open tag ends at
 * `from` — the tab count its DSD variant needs.
 *
 * Markers are always DIRECT children (named slots accept nothing else), so
 * this only inspects depth 0 and skips whole subtrees — including a nested
 * accordion and all of its own tabs, which matters because nesting is
 * first-class here (the offcanvas demo goes four levels deep).
 */
function countTabs(html: string, from: number): number {
  const tag = new RegExp(`<(\\/?)([a-zA-Z][a-zA-Z0-9-]*)(${ATTRS})>`, 'g');
  tag.lastIndex = from;
  let depth = 0;
  let count = 0;
  let m: RegExpExecArray | null;
  while ((m = tag.exec(html))) {
    const [, slash, rawName, attrs] = m;
    if (slash) {
      if (depth === 0) break; // the host's own </mp-accordion>
      depth--;
      continue;
    }
    const isVoid = VOID_ELEMENTS.has(rawName.toLowerCase()) || /\/\s*$/.test(attrs);
    if (depth === 0 && /\baccordion-tab(?![\w-])/.test(attrs)) {
      count++;
    }
    if (!isVoid) depth++;
  }
  return count;
}

/**
 * Injects `<mp-accordion>`'s Declarative Shadow DOM chrome into
 * server-rendered HTML so accordions render — and open, close and switch
 * tabs through their pure-CSS input state machine — with JavaScript
 * disabled. Call it in your SSR server on the HTML string the framework
 * produces, before sending the response.
 *
 * The chrome depends on the tab count and on whether the accordion is
 * `multi` (checkbox machine) or single-open (radio machine), so each
 * instance is measured and matched to a pre-rendered variant — all generated
 * from the element's own `render()`, the single source of truth. Instances
 * with more tabs than variants exist for fall back to the tab-less variant:
 * styled and visible, no state machine. Light-DOM children are untouched, so
 * it is safe with hydration; idempotent via the `shadowrootmode` lookahead.
 */
export function injectMpAccordionDsd(html: string): string {
  if (!html.includes('<mp-accordion')) {
    return html;
  }
  // `(?=[\s>/])` keeps this from matching <mp-accordion-tab>.
  const open = new RegExp(`<mp-accordion(?=[\\s>/])(${ATTRS})>`, 'g');
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
    const multi = /\bmulti(?![\w-])(?!\s*=\s*(?:"false"|'false'))/.test(m[1]);
    const variants = multi
      ? MP_ACCORDION_MULTI_DSD_CHROME_BY_COUNT
      : MP_ACCORDION_DSD_CHROME_BY_COUNT;
    const count = countTabs(html, end);
    result += m[0] + (count < variants.length ? variants[count] : variants[0]);
  }
  return result + html.slice(last);
}
