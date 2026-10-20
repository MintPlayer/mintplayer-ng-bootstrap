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
 * Server rendering: the registry is a browser mechanism (`installLightStyles`
 * is a no-op without `document.head`). A server renderer writes the marker
 * `<style>` itself with {@link writeScopedStyleTag}; the client registry then
 * treats that marker as installed.
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
export function installLightStyles(key: string, styles: ScopedStyleSource | string): void {
  // SSR guard: `typeof document` alone is not enough — @lit-labs/ssr's DOM
  // shim installs a minimal global `document` WITHOUT `head` (measured: the
  // react demo's SSR module runner). Require the parts we actually use.
  if (typeof document === 'undefined' || !document.head) return;
  const registry = getRegistry();
  if (registry.entries.has(key)) return;

  const cssText = typeof styles === 'string' ? styles : styles.cssText;
  const entry: LightStyleEntry = { key, cssText };

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
  if (!ssrCopy) {
    if (entry.sheet) {
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, entry.sheet];
    } else {
      writeScopedStyleTag(document, key, cssText);
    }
  }

  registry.entries.set(key, entry);
  registry.listeners.forEach((listener) => listener(entry));
}

/** Alias with the mechanism's current name; `installLightStyles` stays for the light-tier elements. */
export const installScopedStyles = installLightStyles;

/**
 * Write the marker `<style>` for a sheet into a document's head, once. For
 * server renderers (Angular SSR's `DOCUMENT`, a jsdom/domino document): the
 * registry itself never runs there. Returns true when a tag was written.
 */
export function writeScopedStyleTag(doc: Document, key: string, cssText: string): boolean {
  const head = doc.head;
  if (!head || head.querySelector(`style[${SCOPED_STYLE_MARKER}="${key}"]`)) return false;
  const styleEl = doc.createElement('style');
  styleEl.setAttribute(SCOPED_STYLE_MARKER, key);
  styleEl.textContent = cssText;
  head.appendChild(styleEl);
  return true;
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
  const apply = (entry: LightStyleEntry): void => {
    if (entry.sheet) {
      if (!root.adoptedStyleSheets.includes(entry.sheet)) {
        root.adoptedStyleSheets = [...root.adoptedStyleSheets, entry.sheet];
      }
    } else if (!root.querySelector(`style[${SCOPED_STYLE_MARKER}="${entry.key}"]`)) {
      const styleEl = root.ownerDocument.createElement('style');
      styleEl.setAttribute(SCOPED_STYLE_MARKER, entry.key);
      styleEl.textContent = entry.cssText;
      root.appendChild(styleEl);
    }
  };

  const registry = getRegistry();
  registry.entries.forEach((entry) => apply(entry));
  registry.listeners.add(apply);
  return () => registry.listeners.delete(apply);
}
