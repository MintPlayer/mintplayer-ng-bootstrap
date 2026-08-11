import hljs from 'highlight.js/lib/core';
import type { LanguageFn } from 'highlight.js';
import { hljsLanguageIds, hljsLoaders, type HljsLanguageKey } from '../hljs-loaders.generated';

/**
 * Lazy access to highlight.js.
 *
 * `lib/core` alone is 8.6 KB gzip against `lib/common`'s 53.7 KB, and 331 of
 * 332 in-repo usages name their language up front — so a grammar is fetched on
 * demand and nothing but the core sits in the initial bundle. hljs cannot be
 * tree-shaken into this shape: its package.json `sideEffects` lists
 * `./lib/common.js`, pinning all 36 `registerLanguage` calls.
 *
 * `lib/core` and `lib/common` are the SAME singleton — common.js is literally
 * `require('./core')` followed by 36 registrations — so importing either one
 * mutates the registry this module already holds. That is why nothing here
 * copies grammars between instances, and why `hljs.getLanguage()` is the only
 * source of truth for what is registered.
 *
 * Module-level, not per-element: two snippets on a page share one registry and
 * one in-flight request.
 */

/**
 * In-flight and settled loads, keyed by canonical grammar id. The PROMISE is
 * cached, not the result, so N elements mounting at once share one chunk
 * request instead of starting N. A rejected entry is evicted so a transient
 * failure can be retried on the next render.
 */
const pending = new Map<string, Promise<boolean>>();

/**
 * Distinguishes "that language does not exist" from "the chunk failed to
 * load". Collapsing them is how a lazy highlighter silently renders plain text
 * forever: the old synchronous code caught hljs's `Unknown language` throw and
 * fell through to auto-detect, which under lazy loading would swallow a failed
 * network request with no diagnostic.
 */
export type LanguageLoad = 'ready' | 'unknown-language' | 'load-failed';

const isKnown = (key: string): key is HljsLanguageKey => key in hljsLoaders;

/** Already available on the shared registry, under an id or one of its aliases. */
const isRegistered = (key: string): boolean => hljs.getLanguage(key) != null;

/**
 * Register a grammar outside the 36 the loader map covers, or a custom one.
 * The escape hatch that keeps the lazy map from being a ceiling.
 */
export function registerLanguage(name: string, language: LanguageFn): void {
  hljs.registerLanguage(name, language);
}

/** Whether a language id or alias can be highlighted, now or after a load. */
export function canHighlight(key: string): boolean {
  return isRegistered(key) || isKnown(key);
}

/**
 * Ensure the grammar behind `key` is registered. Resolves to what happened
 * rather than throwing: passing a language this build does not ship is a
 * normal thing for a consumer to do, and normal control flow should not be an
 * exception.
 */
export async function ensureLanguage(key: string): Promise<LanguageLoad> {
  if (isRegistered(key)) return 'ready';
  if (!isKnown(key)) return 'unknown-language';

  // Register under the canonical id — tsx/ts/mts/cts all resolve to
  // typescript, and registering the grammar once lets hljs's own alias table
  // answer for the rest.
  const id = hljsLanguageIds[key];
  let load = pending.get(id);
  if (!load) {
    load = hljsLoaders[key]()
      .then((fn) => {
        if (!isRegistered(id)) hljs.registerLanguage(id, fn);
        return true;
      })
      .catch(() => {
        pending.delete(id);
        return false;
      });
    pending.set(id, load);
  }

  return (await load) ? 'ready' : 'load-failed';
}

/**
 * Load the grammars auto-detection needs, as one chunk.
 *
 * Detection quality is a function of how many grammars are registered, and a
 * thin set detects confidently WRONG — with only typescript registered,
 * `highlightAuto('<div class="a">hi</div>')` returns typescript with non-zero
 * relevance. So auto-detect pulls the whole common set and accepts its size;
 * the win is that the cost is lazy, not that it is smaller.
 */
let commonLoad: Promise<boolean> | null = null;

export function ensureCommonLanguages(): Promise<boolean> {
  // Importing `lib/common` registers all 36 onto the shared singleton; there
  // is nothing to copy and no second instance.
  commonLoad ??= import('highlight.js/lib/common')
    .then(() => true)
    .catch(() => {
      commonLoad = null;
      return false;
    });

  return commonLoad;
}

export interface HighlightOutcome {
  /** Highlighted HTML, or '' when nothing could be highlighted. */
  value: string;
  /** Resolved grammar id, or null when the source was left as plain text. */
  language: string | null;
  load: LanguageLoad;
}

/**
 * Highlight `source`, loading whatever grammar is needed first.
 *
 * Never throws: an unknown language or a failed chunk yields `value: ''` plus
 * a `load` the caller can act on, and the element renders escaped plain text —
 * which is also what it shows while the grammar is still in flight.
 */
export async function highlight(source: string, language: string): Promise<HighlightOutcome> {
  if (!source) return { value: '', language: null, load: 'ready' };

  if (language) {
    const load = await ensureLanguage(language);
    if (load !== 'ready') return { value: '', language: null, load };
    const result = hljs.highlight(source, { language, ignoreIllegals: true });
    return { value: result.value, language: result.language ?? language, load: 'ready' };
  }

  if (!(await ensureCommonLanguages())) {
    return { value: '', language: null, load: 'load-failed' };
  }
  const result = hljs.highlightAuto(source);
  return { value: result.value, language: result.language ?? null, load: 'ready' };
}
