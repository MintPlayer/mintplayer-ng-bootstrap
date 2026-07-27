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

/**
 * One attribute of a tag: name plus an optional quoted or bare value. Scanning
 * with this rather than searching the raw attribute text is what keeps a value
 * from being read as a name — `aria-label="multi tabs"` does not make an
 * accordion `multi`, and `class="accordion-tabs"` does not make an element a
 * tab marker.
 */
const ATTR_TOKEN = /([a-zA-Z_:][-\w:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'`=<>]+)))?/g;

/** The attribute's value, `''` when valueless, or `null` when absent. */
function readAttribute(attrs: string, name: string): string | null {
  ATTR_TOKEN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = ATTR_TOKEN.exec(attrs))) {
    if (match[1].toLowerCase() === name) return match[2] ?? match[3] ?? match[4] ?? '';
  }
  return null;
}

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
    if (depth === 0 && readAttribute(attrs, 'accordion-tab') !== null) {
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
  const close = /<\/mp-accordion\s*>/g;
  let result = '';
  let last = 0;
  // How many enclosing accordions are still open at the current position —
  // the element itself can only work this out in connectedCallback, which
  // never runs server-side, so the nesting flag is stamped here instead.
  let depth = 0;
  let m: RegExpExecArray | null;
  while ((m = open.exec(html))) {
    const end = open.lastIndex;
    close.lastIndex = last;
    let c: RegExpExecArray | null;
    while ((c = close.exec(html)) && c.index < m.index) depth = Math.max(0, depth - 1);
    result += html.slice(last, m.index);
    last = end;

    if (/^\s*<template[^>]*shadowrootmode/.test(html.slice(end, end + 120))) {
      result += m[0]; // already has a DSD — leave untouched
      depth++;
      continue;
    }
    const multiAttribute = readAttribute(m[1], 'multi');
    const multi = multiAttribute !== null && multiAttribute !== 'false';
    const variants = multi
      ? MP_ACCORDION_MULTI_DSD_CHROME_BY_COUNT
      : MP_ACCORDION_DSD_CHROME_BY_COUNT;
    const count = countTabs(html, end);
    const openTag =
      depth > 0 && readAttribute(m[1], 'data-nested') === null
        ? m[0].replace(/\s*\/?>$/, (tail) => ` data-nested${tail}`)
        : m[0];
    result += openTag + (count < variants.length ? variants[count] : variants[0]);
    depth++;
  }
  return result + html.slice(last);
}
