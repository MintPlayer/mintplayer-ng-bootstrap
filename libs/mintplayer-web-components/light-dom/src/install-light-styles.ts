import type { CSSResult } from 'lit';

/**
 * Document-level installation of light-tier component styles
 * (docs/prd/wc-style-encapsulation.md §L5), generalizing the pattern that
 * `ensureCardStylesInjected` pioneered.
 *
 * A light-tier component has no shadow root, so its (rescoped) styles go to
 * the document — once per component class, at `customElements.define` time.
 * The registry lives on `globalThis` under a `Symbol.for` key so a second
 * copy of the library (another bundle, a microfrontend) sees the same state
 * and installing degrades to a no-op instead of a duplicate sheet.
 *
 * The same registry is the bridge into render-callback shadow trees (issue
 * #408): components that adopt consumer DOM into their shadow root (datatable,
 * treeview) call `adoptLightStyles(shadowRoot)` so consumer content keeps its
 * light-tier styling inside those trees — including sheets registered later.
 */

const REGISTRY_KEY = Symbol.for('mp.lightStyles');

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

const MARKER_ATTRIBUTE = 'data-mp-light-styles';

function supportsConstructableSheets(): boolean {
  return (
    typeof document !== 'undefined' &&
    'adoptedStyleSheets' in Document.prototype &&
    typeof CSSStyleSheet !== 'undefined' &&
    'replaceSync' in CSSStyleSheet.prototype
  );
}

/**
 * Install a light-tier component's rescoped stylesheet at document level.
 * Idempotent per `key`, cross-bundle safe, no-op during SSR. Call it right
 * before `customElements.define`, so styles precede the first render.
 *
 * A `<style data-mp-light-styles="<key>">` already present in `<head>` (an
 * SSR-emitted copy) counts as installed — only the registry entry is added,
 * so shadow adopters still get a sheet.
 */
export function installLightStyles(key: string, styles: CSSResult | string): void {
  // SSR guard: `typeof document` alone is not enough — @lit-labs/ssr's DOM
  // shim installs a minimal global `document` WITHOUT `head` (measured: the
  // react demo's SSR module runner). Require the parts we actually use.
  if (typeof document === 'undefined' || !document.head) return;
  const registry = getRegistry();
  if (registry.entries.has(key)) return;

  const cssText = typeof styles === 'string' ? styles : styles.cssText;
  const entry: LightStyleEntry = { key, cssText };

  if (supportsConstructableSheets()) {
    const litSheet = typeof styles === 'string' ? undefined : styles.styleSheet;
    if (litSheet) {
      entry.sheet = litSheet;
    } else {
      entry.sheet = new CSSStyleSheet();
      entry.sheet.replaceSync(cssText);
    }
  }

  const ssrCopy = document.head.querySelector(
    `style[${MARKER_ATTRIBUTE}="${key}"]`,
  );
  if (!ssrCopy) {
    if (entry.sheet) {
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, entry.sheet];
    } else {
      const styleEl = document.createElement('style');
      styleEl.setAttribute(MARKER_ATTRIBUTE, key);
      styleEl.textContent = cssText;
      document.head.appendChild(styleEl);
    }
  }

  registry.entries.set(key, entry);
  for (const listener of registry.listeners) listener(entry);
}

/** Snapshot of everything installed so far. */
export function getLightStyleEntries(): LightStyleEntry[] {
  return [...getRegistry().entries.values()];
}

/**
 * Mirror all light-tier sheets — current and future — into a shadow root, so
 * consumer DOM adopted into it (render callbacks) keeps its light-tier
 * styling. Returns a disposer; call it from `disconnectedCallback`.
 */
export function adoptLightStyles(root: ShadowRoot): () => void {
  const apply = (entry: LightStyleEntry): void => {
    if (entry.sheet) {
      if (!root.adoptedStyleSheets.includes(entry.sheet)) {
        root.adoptedStyleSheets = [...root.adoptedStyleSheets, entry.sheet];
      }
    } else if (!root.querySelector(`style[${MARKER_ATTRIBUTE}="${entry.key}"]`)) {
      const styleEl = root.ownerDocument.createElement('style');
      styleEl.setAttribute(MARKER_ATTRIBUTE, entry.key);
      styleEl.textContent = entry.cssText;
      root.appendChild(styleEl);
    }
  };

  const registry = getRegistry();
  for (const entry of registry.entries.values()) apply(entry);
  registry.listeners.add(apply);
  return () => registry.listeners.delete(apply);
}
