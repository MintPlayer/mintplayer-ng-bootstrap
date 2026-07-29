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
 * Measure the tab markers of the `<mp-accordion>` whose open tag ends at
 * `from` — the tab count its DSD variant needs, plus which tabs are marked
 * `is-active` so their `<details>` can be stamped `[open]` (the initial
 * state the pre-D1 radio machine could never express — spike 0.1a).
 *
 * Markers are always DIRECT children (named slots accept nothing else), so
 * this only inspects depth 0 and skips whole subtrees — including a nested
 * accordion and all of its own tabs, which matters because nesting is
 * first-class here (the offcanvas demo goes four levels deep).
 *
 * A depth-0 `<mp-accordion-tab>` counts by TAG too: the vanilla element only
 * tags itself with `accordion-tab` in connectedCallback, which never runs
 * server-side, so vanilla markup must match what the wrappers stamp.
 */
function measureTabs(html: string, from: number): { count: number; activeIndexes: number[] } {
  const tag = new RegExp(`<(\\/?)([a-zA-Z][a-zA-Z0-9-]*)(${ATTRS})>`, 'g');
  tag.lastIndex = from;
  let depth = 0;
  let count = 0;
  const activeIndexes: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = tag.exec(html))) {
    const [, slash, rawName, attrs] = m;
    if (slash) {
      if (depth === 0) break; // the host's own </mp-accordion>
      depth--;
      continue;
    }
    const isVoid = VOID_ELEMENTS.has(rawName.toLowerCase()) || /\/\s*$/.test(attrs);
    const isTab =
      readAttribute(attrs, 'accordion-tab') !== null ||
      rawName.toLowerCase() === 'mp-accordion-tab';
    if (depth === 0 && isTab) {
      if (readAttribute(attrs, 'is-active') !== null) activeIndexes.push(count);
      count++;
    }
    if (!isVoid) depth++;
  }
  return { count, activeIndexes };
}

/**
 * Stamp `open` onto the n-th `<details>` rows of a chrome variant. The
 * variants are generated with every row closed (the generator has no light
 * DOM to read); the parser then opens exactly what the markers say, and
 * `<details name>` exclusivity needs no further help.
 */
function stampOpen(variant: string, activeIndexes: number[]): string {
  if (!activeIndexes.length) return variant;
  const wanted = new Set(activeIndexes);
  let index = -1;
  return variant.replace(/<details(?=[\s>/])/g, (tag) => {
    index++;
    return wanted.has(index) ? `${tag} open` : tag;
  });
}

/**
 * Injects `<mp-accordion>`'s Declarative Shadow DOM chrome into
 * server-rendered HTML so accordions render — and open, close and switch
 * tabs natively via `<details name>`/`<summary>` — with JavaScript disabled.
 * Call it in your SSR server on the HTML string the framework produces,
 * before sending the response.
 *
 * The chrome depends on the tab count and on whether the accordion is
 * `multi` (no `name` group) or single-open (`name` exclusivity), so each
 * instance is measured and matched to a pre-rendered variant — all generated
 * from the element's own `render()`, the single source of truth — and the
 * tabs marked `is-active` get `[open]` stamped on their `<details>`.
 * Instances with more tabs than variants exist for fall back to the tab-less
 * variant: styled and visible through the default slot. Light-DOM children
 * are untouched, so it is safe with hydration; idempotent via the
 * `shadowrootmode` lookahead.
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
    const { count, activeIndexes } = measureTabs(html, end);
    const openTag =
      depth > 0 && readAttribute(m[1], 'data-nested') === null
        ? m[0].replace(/\s*\/?>$/, (tail) => ` data-nested${tail}`)
        : m[0];
    const variant = count < variants.length ? variants[count] : variants[0];
    result += openTag + stampOpen(variant, activeIndexes);
    depth++;
  }
  return result + html.slice(last);
}
