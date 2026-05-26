/**
 * Lit-SSR post-process middleware.
 *
 * Pipeline (per request):
 *   1. `@angular/ssr` renders the Angular component tree and returns an HTML
 *      string. Custom-element tags appear as bare hosts with light-DOM
 *      children — empty shells, no shadow content.
 *   2. This module parses that HTML with parse5, walks the tree, and for
 *      every tag in `SSR_TAGS` invokes `@lit-labs/ssr` to render the WC's
 *      shadow DOM with `is-server-side` set. The resulting
 *      `<template shadowrootmode="open">…</template>` payload is spliced as
 *      the first child of the host element.
 *   3. The browser parses the enriched HTML, the parser attaches the shadow
 *      root from the declarative `<template>`, and the WC renders visibly
 *      before any JavaScript runs.
 *
 * On the client, `@lit-labs/ssr-client/lit-element-hydrate-support.js` (loaded
 * from `src/main.ts`) handles the WC upgrade. WCs that branch on
 * `isServerSide` opt out of hydration in their own `connectedCallback`.
 */

// Install the DOM shim BEFORE any module that triggers `customElements.define`.
// Importing `@lit-labs/ssr/lib/install-global-dom-shim.js` side-effect-installs
// the globals (`customElements`, minimal `Element.attachShadow`, etc.).
import '@lit-labs/ssr/lib/install-global-dom-shim.js';

// Register the WC tags whose shadow DOM we want SSR'd. Each side-effect import
// runs `customElements.define(...)` against the now-shimmed registry. We also
// stash the class references because Angular SSR swaps the global
// `customElements` registry per-request — without these pins, the middleware
// would see an empty registry when it tries to `LitElementRenderer(tagName)`.
import { MpAccordion } from '@mintplayer/web-components/accordion';

const PINNED_WC_CLASSES: Record<string, CustomElementConstructor> = {
  'mp-accordion': MpAccordion as unknown as CustomElementConstructor,
};

/**
 * Ensure pinned WC classes are present in the current global
 * `customElements` registry. Idempotent — only defines if missing.
 */
function ensureRegistered(): void {
  for (const [tagName, ctor] of Object.entries(PINNED_WC_CLASSES)) {
    if (!customElements.get(tagName)) {
      customElements.define(tagName, ctor);
    }
  }
}

import { LitElementRenderer } from '@lit-labs/ssr/lib/lit-element-renderer.js';
import type { RenderInfo } from '@lit-labs/ssr';
import * as parse5 from 'parse5';
import type { DefaultTreeAdapterMap } from 'parse5';

type ParsedNode = DefaultTreeAdapterMap['node'];
type ParsedElement = DefaultTreeAdapterMap['element'];
type ParsedChildNode = DefaultTreeAdapterMap['childNode'];

const SSR_TAGS = new Set(['mp-accordion']);


function isElement(node: ParsedNode): node is ParsedElement {
  return 'tagName' in node;
}

function* walk(node: ParsedNode): Generator<ParsedElement> {
  if (isElement(node)) {
    yield node;
  }
  const children = (node as { childNodes?: ParsedNode[] }).childNodes;
  if (children) {
    for (const child of children) {
      yield* walk(child);
    }
  }
}

function attrMap(el: ParsedElement): Record<string, string> {
  const out: Record<string, string> = {};
  for (const a of el.attrs) out[a.name] = a.value;
  return out;
}

/**
 * Render one WC instance's shadow DOM as a string, using `LitElementRenderer`
 * directly. Bypasses the high-level `render(html\`...\`)` path because that
 * one's template-cache + tag-resolution interaction with our bundling produced
 * empty shadow output. Going through the renderer instance gives us full
 * control over attribute set + shadow render.
 */
function renderWcAsDsd(tagName: string, attrs: Record<string, string>): string {
  const renderer = new LitElementRenderer(tagName);
  // Mirror the post-process middleware's "set is-server-side" decision onto the
  // renderer's element instance so its render() branches into renderSsr().
  renderer.setAttribute('is-server-side', '');
  for (const [name, value] of Object.entries(attrs)) {
    if (name === 'is-server-side') continue;
    renderer.setAttribute(name, value);
  }
  renderer.connectedCallback();

  const renderInfo = {
    elementRenderers: [LitElementRenderer],
    customElementInstanceStack: [renderer],
    // Pre-push the host so any `<slot>` inside the shadow finds a host.
    // (`render-value` looks at customElementHostStack, not InstanceStack.)
    customElementHostStack: [renderer],
    eventTargetStack: [],
    slotStack: [],
    deferHydration: false,
  } as unknown as RenderInfo;

  const shadowContents = renderer.renderShadow(renderInfo);
  if (!shadowContents) return '';

  let inner = '';
  const flatten = (value: unknown): void => {
    let v = value;
    while (typeof v === 'function') v = (v as () => unknown)();
    if (v === undefined || v === null) return;
    if (typeof v === 'string') {
      inner += v;
      return;
    }
    if (Array.isArray(v) || (typeof (v as { [Symbol.iterator]?: unknown })[Symbol.iterator] === 'function')) {
      for (const sub of v as Iterable<unknown>) flatten(sub);
      return;
    }
    // Promises not handled — sync renderShadow is expected for our WCs.
  };
  flatten(shadowContents);

  return `<template shadowrootmode="open">${inner}</template>`;
}

const PER_TAG_SHADOW_RENDERER: Record<string, (attrs: Record<string, string>) => string> = {
  'mp-accordion': (a) => renderWcAsDsd('mp-accordion', a),
};

function alreadyHasDsd(el: ParsedElement): boolean {
  for (const child of el.childNodes ?? []) {
    if (isElement(child) && child.tagName === 'template') {
      if (child.attrs.some((a) => a.name === 'shadowrootmode')) return true;
    }
  }
  return false;
}

function setIsServerSideAttr(el: ParsedElement): void {
  if (!el.attrs.some((a) => a.name === 'is-server-side')) {
    el.attrs.push({ name: 'is-server-side', value: '' });
  }
}

/**
 * Enrich an HTML string with DSD payloads for every registered WC tag.
 * No-op if no target tags are present (so non-component routes pay only the
 * parse5 round-trip).
 */
export function enrichSsrHtml(htmlIn: string): string {
  // Fast path: if no target tags appear in the string, skip parse5 entirely.
  let hasAny = false;
  for (const tag of SSR_TAGS) {
    if (htmlIn.includes('<' + tag)) {
      hasAny = true;
      break;
    }
  }
  if (!hasAny) return htmlIn;

  // Angular SSR swaps the global `customElements` registry per-request. Re-pin
  // our WC classes so `LitElementRenderer(tagName)` can instantiate them.
  ensureRegistered();

  const doc = parse5.parse(htmlIn);
  for (const el of walk(doc as ParsedNode)) {
    if (!SSR_TAGS.has(el.tagName)) continue;
    if (alreadyHasDsd(el)) continue;

    setIsServerSideAttr(el);
    const attrs = attrMap(el);

    const shadowRenderer = PER_TAG_SHADOW_RENDERER[el.tagName];
    if (!shadowRenderer) continue;

    const dsd = shadowRenderer(attrs);
    if (!dsd) continue;

    const fragment = parse5.parseFragment(dsd);
    const fragChildren = fragment.childNodes as ParsedChildNode[];
    // Prepend to host's childNodes in original order.
    for (let i = fragChildren.length - 1; i >= 0; i--) {
      const n = fragChildren[i];
      (n as { parentNode?: ParsedElement }).parentNode = el;
      el.childNodes.unshift(n);
    }
  }
  return parse5.serialize(doc);
}
