/**
 * Every flag this package ships, keyed by lowercase ISO 3166-1 alpha-2 code.
 *
 * Indexed by plain `string` on purpose, matching `loadFlag`: a caller looking a
 * country up at runtime has a string, and a code this package does not ship
 * reads as `undefined` rather than needing a cast at every call site.
 */
export interface FlagMap {
  readonly [code: string]: string | undefined;
}

const EMPTY: FlagMap = Object.freeze({});

let pending: Promise<FlagMap> | undefined;

/**
 * Load the whole flag corpus as one lazy chunk (~43 KB gzip, one request).
 *
 * This is the loader for anything that displays *many* flags at once — a country
 * picker, a locale list — and the reason it exists is measured: fetching the same
 * 244 flags as individual `loadFlag()` chunks takes **3.2 s** to complete over
 * HTTP/1.1 at 50 ms RTT (1.9 s at 20 ms, 0.44 s over HTTP/2) against **0.2 s**
 * for this one, and costs 90 KB gzip plus ~50 KB of response headers against
 * 43 KB. Separate compression is the bulk of it: the corpus gzips to 43 KB
 * together and 90 KB apart.
 *
 * Prefer {@link loadFlag} only when a handful of specific flags is genuinely all
 * that will ever be shown — that pays ~350 B gzip per flag instead of 43 KB.
 * The two do not share a cache: calling both fetches the flag twice (a few
 * hundred bytes), which is the price of keeping either one droppable by a
 * bundler.
 *
 * Never rejects. Repeat calls share one fetch; a failed load resolves to an
 * empty map and is retried on the next call, so `map[code]` is `undefined`
 * exactly as an unknown code would be.
 */
export function loadAllFlags(): Promise<FlagMap> {
  return (pending ??= import('./all-flags.generated')
    .then((m) => m.allFlags as FlagMap)
    .catch(() => {
      pending = undefined;
      return EMPTY;
    }));
}
