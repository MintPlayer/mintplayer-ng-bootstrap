/**
 * Document-level installation of scoped component styles — and the ONLY
 * document-level CSS writer across the libraries. Moved here from
 * `@mintplayer/web-components/light-dom` (#436 D8) so every front — Angular,
 * React, Vue and the Lit elements — installs the same sheet through the same
 * registry; the web-components entry re-exports it unchanged.
 *
 * A scoped sheet is a component's stylesheet rescoped at build time with a
 * `[data-mps=<scope>]` attribute selector (emulated encapsulation, the way
 * Angular's `ViewEncapsulation.Emulated` does it). It goes to the document once
 * per component class. The registry lives on `globalThis` under a `Symbol.for`
 * key so a second copy of the library (another bundle, a microfrontend) sees
 * the same state and installing degrades to a no-op instead of a duplicate
 * sheet.
 *
 * The same registry is the bridge into render-callback shadow trees (issue
 * #408): shadow-rooted components that render light-tier components or
 * consumer DOM inside their shadow root (mp-file-manager) call
 * `adoptLightStyles(shadowRoot)` so that content keeps its styling inside
 * those trees — including sheets registered later.
 *
 * Server rendering: without a `document.head` (Node, or the lit-ssr DOM shim
 * the React and Vue demos run under) `installLightStyles` only RECORDS the
 * sheet into the renders in progress, and {@link collectScopedStyles} returns
 * one render's sheets as marker `<style>` tags for the server to splice into
 * the page head (PRD #437 S12, per render since #452).
 * Angular SSR has a real `DOCUMENT` and writes the tag itself with
 * {@link writeScopedStyleTag}. Either way the client registry treats the marker
 * as installed, so hydration adds no second copy.
 */

const REGISTRY_KEY = Symbol.for('mp.lightStyles');

/** Anything with a `cssText` — a lit `CSSResult` qualifies — or a plain string. */
export interface ScopedStyleSource {
  cssText: string;
  /** A sheet already constructed for this CSS (lit builds one where adoptable sheets are supported). */
  styleSheet?: CSSStyleSheet | null;
}

export interface LightStyleEntry {
  key: string;
  cssText: string;
  /** Present when constructable stylesheets are supported. */
  sheet?: CSSStyleSheet;
  /** Position among the ORDERED sheets (Bootstrap parts); see {@link InstallOptions.order}. */
  order?: number;
}

interface LightStyleRegistry {
  entries: Map<string, LightStyleEntry>;
  listeners: Set<(entry: LightStyleEntry) => void>;
}

function getRegistry(): LightStyleRegistry {
  const g = globalThis as Record<symbol, unknown>;
  return ((g[REGISTRY_KEY] as LightStyleRegistry | undefined) ??= {
    entries: new Map(),
    listeners: new Set(),
  });
}

/** The attribute a document-level `<style>` carries so a registry copy recognises it. */
export const SCOPED_STYLE_MARKER = 'data-mp-light-styles';

/** The attribute an ORDERED marker `<style>` carries: its {@link InstallOptions.order}. */
export const SCOPED_STYLE_ORDER = 'data-mp-order';

/**
 * Ordered sheets (#452): the Bootstrap parts share one cascade layer, where
 * stock Bootstrap breaks equal-specificity ties between partials by source
 * order. The registry keeps them in `order` whatever the install order.
 *
 * Adopted sheets cascade AFTER every `<style>` element, so the two mechanisms
 * are ordered together by one rule: an ordered sheet that must precede an
 * ordered marker `<style>` already in the head (a server-rendered copy) is
 * written as a `<style>` right before it; any other ordered sheet is adopted,
 * at its sorted position among the adopted ordered sheets. The `<style>` tags
 * then form a sorted prefix (their maximum is the largest server-rendered one,
 * which no later install exceeds as a tag) and the adopted sheets a sorted
 * suffix above it. Unordered sheets (component sheets, in `mp.components`) are
 * not ordered against anything: their layer decides.
 */
function orderedStyleAfter(parent: ParentNode, order: number): Element | null {
  // Direct children only: the result is an insertBefore reference. Array.from over
  // childNodes, never a spread of `children`: Angular's SSR DOM (domino) has no
  // iterable `children` on the head, and the server render threw on it.
  return (Array.from(parent.childNodes) as Node[])
    .filter((node): node is Element => node.nodeType === 1)
    .find((el) => el.localName === 'style' && el.hasAttribute(SCOPED_STYLE_ORDER) && Number(el.getAttribute(SCOPED_STYLE_ORDER)) > order) ?? null;
}

function insertOrderedSheet(sheets: readonly CSSStyleSheet[], sheet: CSSStyleSheet, order: number | undefined): CSSStyleSheet[] {
  if (order === undefined) return [...sheets, sheet];
  const orders = new Map([...getRegistry().entries.values()].filter((e) => e.sheet && e.order !== undefined).map((e) => [e.sheet!, e.order!]));
  const at = sheets.findIndex((s) => (orders.get(s) ?? -Infinity) > order);
  return at < 0 ? [...sheets, sheet] : [...sheets.slice(0, at), sheet, ...sheets.slice(at)];
}

function createStyleTag(doc: Document, key: string, cssText: string, order: number | undefined): HTMLStyleElement {
  const styleEl = doc.createElement('style');
  styleEl.setAttribute(SCOPED_STYLE_MARKER, key);
  if (order !== undefined) styleEl.setAttribute(SCOPED_STYLE_ORDER, String(order));
  styleEl.textContent = cssText;
  return styleEl;
}

function supportsConstructableSheets(): boolean {
  return (
    typeof document !== 'undefined' &&
    'adoptedStyleSheets' in Document.prototype &&
    typeof CSSStyleSheet !== 'undefined' &&
    'replaceSync' in CSSStyleSheet.prototype
  );
}

/**
 * Install a component's scoped stylesheet at document level. Idempotent per
 * `key`, cross-bundle safe, no-op during SSR. Call it before the first render
 * (a Lit element: right before `customElements.define`; a framework front: in
 * its constructor or setup).
 *
 * A `<style data-mp-light-styles="<key>">` already present in `<head>` (an
 * SSR-emitted copy) counts as installed — only the registry entry is added,
 * so shadow adopters still get a sheet.
 */
export function installLightStyles(key: string, styles: ScopedStyleSource | string, options: InstallOptions = {}): void {
  const cssText = typeof styles === 'string' ? styles : styles.cssText;
  // SSR guard: `typeof document` alone is not enough — a server DOM shim can
  // install a global `document` WITHOUT a usable `head` (measured with
  // @lit-labs/ssr's shim; Angular's SSR shim is the same kind of risk).
  // Require the parts we actually use.
  if (typeof document === 'undefined' || !document.head) {
    recordServerSheet(key, cssText, options);
    return;
  }
  const registry = getRegistry();
  const existing = registry.entries.get(key);
  if (existing) {
    if (options.replace && existing.cssText !== cssText) replaceEntry(existing, cssText);
    return;
  }

  const entry: LightStyleEntry = { key, cssText, order: options.order };

  if (supportsConstructableSheets()) {
    const prebuilt = typeof styles === 'string' ? undefined : styles.styleSheet;
    if (prebuilt) {
      entry.sheet = prebuilt;
    } else {
      entry.sheet = new CSSStyleSheet();
      entry.sheet.replaceSync(cssText);
    }
  }

  const ssrCopy = document.head.querySelector(`style[${SCOPED_STYLE_MARKER}="${key}"]`);
  if (ssrCopy) {
    // The server wrote this key. A replacing install with other text upgrades
    // the server's copy in place (the server may have rendered only the
    // scoped variant of a Bootstrap part).
    if (options.replace && ssrCopy.textContent !== cssText) ssrCopy.textContent = cssText;
  } else {
    const before = options.order === undefined ? null : orderedStyleAfter(document.head, options.order);
    if (entry.sheet && !before) {
      document.adoptedStyleSheets = insertOrderedSheet(document.adoptedStyleSheets, entry.sheet, options.order);
    } else {
      writeScopedStyleTag(document, key, cssText, { order: options.order });
    }
  }

  registry.entries.set(key, entry);
  registry.listeners.forEach((listener) => listener(entry));
}

export interface InstallOptions {
  /**
   * Replace a sheet already installed under the same key when its text
   * differs, instead of keeping the first one. Only for a sheet that matches a
   * SUPERSET of the installed one with the same specificity: the verbatim
   * variant of a Bootstrap part over its scoped variant (#452 §3.1). Updated in
   * place (the constructed sheet, every shadow root that adopted it, and the
   * head `<style>`), so the page never holds two copies.
   */
  replace?: boolean;
  /**
   * Keep this sheet in a fixed position among the other ordered sheets,
   * whatever the install order (#452: a Bootstrap part's stock position, so
   * equal-specificity ties between partials in their shared layer resolve as
   * in stock Bootstrap). Fixed by the first install of a key.
   */
  order?: number;
}

function replaceEntry(entry: LightStyleEntry, cssText: string): void {
  entry.cssText = cssText;
  // One sheet object is shared by the document and every adopting shadow root.
  entry.sheet?.replaceSync(cssText);
  const tag = document.head.querySelector(`style[${SCOPED_STYLE_MARKER}="${entry.key}"]`);
  if (tag) tag.textContent = cssText;
}

/** Alias with the mechanism's current name; `installLightStyles` stays for the light-tier elements. */
export const installScopedStyles = installLightStyles;

/**
 * Write the marker `<style>` for a sheet into a document's head, once. For
 * server renderers (Angular SSR's `DOCUMENT`, a jsdom/domino document): the
 * registry itself never runs there. Returns true when a tag was written.
 */
export function writeScopedStyleTag(doc: Document, key: string, cssText: string, options: InstallOptions = {}): boolean {
  const head = doc.head;
  if (!head) return false;
  const existing = head.querySelector(`style[${SCOPED_STYLE_MARKER}="${key}"]`);
  if (existing) {
    if (!options.replace || existing.textContent === cssText) return false;
    existing.textContent = cssText;
    return true;
  }
  const before = options.order === undefined ? null : orderedStyleAfter(head, options.order);
  head.insertBefore(createStyleTag(doc, key, cssText, options.order), before);
  return true;
}

const COLLECTORS_KEY = Symbol.for('mp.scopedStyles.collectors');

interface ServerSheet {
  cssText: string;
  order?: number;
}

/** The sheets one server render installed, by key. */
type Collector = Map<string, ServerSheet>;

/** The renders in progress: every install where there is no document goes to each of them. */
function openCollectors(): Set<Collector> {
  const g = globalThis as Record<symbol, unknown>;
  return ((g[COLLECTORS_KEY] as Set<Collector> | undefined) ??= new Set());
}

function recordServerSheet(key: string, cssText: string, options: InstallOptions): void {
  openCollectors().forEach((sheets) => {
    const existing = sheets.get(key);
    if (!existing) sheets.set(key, { cssText, order: options.order });
    else if (options.replace) existing.cssText = cssText;
  });
}

/**
 * Run a server render and collect the scoped sheets it installed, as marker
 * `<style>` tags for the page head (React/Vue `entry-server`). The record is
 * PER RENDER (#452): a page's head carries only what that page rendered, never
 * a sheet an earlier request installed. Renders that overlap in time (an async
 * React or Vue render awaiting a lazy route) each see the other's installs too;
 * a superset, never a miss. So a front must install while it renders (in the
 * component body / setup), not once at module scope.
 *
 * Every sheet starts with the layer order statement, so only the ORDERED sheets
 * (Bootstrap parts, sharing one layer) need an order among themselves: they are
 * emitted sorted, each carrying its order for the client registry.
 */
export async function collectScopedStyles<T>(render: () => Promise<T> | T): Promise<{ result: T; styles: string }> {
  const sheets: Collector = new Map();
  const collectors = openCollectors();
  collectors.add(sheets);
  try {
    const result = await render();
    return { result, styles: serializeSheets(sheets) };
  } finally {
    collectors.delete(sheets);
  }
}

function serializeSheets(sheets: Collector): string {
  return [...sheets]
    .map(([key, sheet], index) => ({ key, ...sheet, index }))
    .sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity) || a.index - b.index)
    .map(({ key, cssText, order }) => `<style ${SCOPED_STYLE_MARKER}="${key}"${order === undefined ? '' : ` ${SCOPED_STYLE_ORDER}="${order}"`}>${cssText.replace(/<\/style/gi, '<\\/style')}</style>`)
    .join('');
}

/** Snapshot of everything installed so far. */
export function getLightStyleEntries(): LightStyleEntry[] {
  return [...getRegistry().entries.values()];
}

/**
 * Mirror all scoped sheets — current and future — into a shadow root, so
 * consumer DOM adopted into it (render callbacks) keeps its styling. Returns a
 * disposer; call it from `disconnectedCallback`.
 */
export function adoptLightStyles(root: ShadowRoot): () => void {
  // Ordered sheets keep their order inside the shadow root too.
  const apply = (entry: LightStyleEntry): void => {
    if (entry.sheet) {
      if (!root.adoptedStyleSheets.includes(entry.sheet)) {
        root.adoptedStyleSheets = insertOrderedSheet(root.adoptedStyleSheets, entry.sheet, entry.order);
      }
    } else if (!root.querySelector(`style[${SCOPED_STYLE_MARKER}="${entry.key}"]`)) {
      const before = entry.order === undefined ? null : orderedStyleAfter(root, entry.order);
      root.insertBefore(createStyleTag(root.ownerDocument, entry.key, entry.cssText, entry.order), before);
    }
  };

  const registry = getRegistry();
  [...registry.entries.values()]
    .sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity))
    .forEach((entry) => apply(entry));
  registry.listeners.add(apply);
  return () => registry.listeners.delete(apply);
}
