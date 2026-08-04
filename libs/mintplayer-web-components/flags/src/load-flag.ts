import { flagLoaders, type CountryCode } from './flag-loaders.generated';

/**
 * Resolved SVG markup per country, keyed by lowercase ISO code.
 *
 * The promise is cached rather than the string so concurrent callers share one
 * chunk fetch. A rejected load is evicted so a transient network failure does
 * not poison the code for the page's lifetime.
 */
const cache = new Map<CountryCode, Promise<string | undefined>>();

function isKnown(code: string): code is CountryCode {
  return code in flagLoaders;
}

/**
 * Load the 3x2 SVG markup for an ISO 3166-1 alpha-2 country code.
 *
 * Case-insensitive. Never rejects: an unknown code — and a chunk that fails to
 * load — resolve to `undefined`, so callers render their placeholder and move
 * on instead of guarding every call.
 */
export function loadFlag(code: string): Promise<string | undefined> {
  const iso2 = code.trim().toLowerCase();
  if (!isKnown(iso2)) return Promise.resolve(undefined);

  const cached = cache.get(iso2);
  if (cached) return cached;

  const pending = flagLoaders[iso2]().catch(() => {
    cache.delete(iso2);
    return undefined;
  });
  cache.set(iso2, pending);
  return pending;
}
