import type { ComponentCore } from '@mintplayer/ui-core/component';
import { canonicalValue, type JsonValue } from './canonical';

/** How long a server render waits for one component's prefetch, ms (#448 D6). */
export const DEFAULT_PREFETCH_TIMEOUT = 3000;

export interface PrefetchOptions {
  /** ms; the app-level setting every bridge exposes. */
  readonly timeout?: number;
  /** The render's own abort, if the host has one. */
  readonly signal?: AbortSignal;
  /** Where an abandoned prefetch is reported. Default: `console.warn`. */
  readonly warn?: (message: string) => void;
}

/** What a prefetch produced: the seed to render and transfer, under its key; null when there is nothing. */
export interface PrefetchResult {
  readonly key: string;
  readonly seed: JsonValue;
}

type PrefetchCore<I> = Pick<ComponentCore<I, unknown, unknown>, 'prefetch' | 'transferKey'>;

const anySignal = (signals: AbortSignal[]): AbortSignal => {
  if (typeof AbortSignal.any === 'function') return AbortSignal.any(signals);
  const controller = new AbortController();
  signals.map((s) => (s.aborted ? controller.abort(s.reason) : s.addEventListener('abort', () => controller.abort(s.reason), { once: true })));
  return controller.signal;
};

/**
 * Runs a core's server prefetch under the generic timeout (#448 D6), for any
 * component: the bridges call this and never a core's `prefetch` directly.
 * Resolves (never rejects) with the seed, or null when the core has nothing to
 * prefetch or the prefetch timed out, failed or was aborted. A null result
 * writes nothing, so the server renders the core's loading snapshot and the
 * client fetches as if there had been no server render.
 */
export async function runPrefetch<I>(core: PrefetchCore<I>, inputs: Readonly<I>, options: PrefetchOptions = {}): Promise<PrefetchResult | null> {
  const key = core.transferKey?.(inputs);
  if (!key || !core.prefetch) return null;
  const timeout = options.timeout ?? DEFAULT_PREFETCH_TIMEOUT;
  const timer = new AbortController();
  const signal = anySignal([timer.signal, ...(options.signal ? [options.signal] : [])]);
  const warn = options.warn ?? ((message: string) => console.warn(message));
  let handle: ReturnType<typeof setTimeout> | undefined;
  const started = Date.now();
  try {
    const pending = core.prefetch(inputs, signal);
    if (!pending) return null;
    const expired = new Promise<'timeout'>((resolve) => {
      handle = setTimeout(() => {
        timer.abort(new DOMException('Server prefetch timed out', 'TimeoutError'));
        resolve('timeout');
      }, timeout);
    });
    const seed = await Promise.race([pending, expired]);
    if (seed === 'timeout') {
      warn(`[mp-ssr] prefetch for ${key} timed out after ${timeout} ms; rendered without data, the browser fetches it.`);
      return null;
    }
    if (signal.aborted) return null;
    // Validated here, on the server, where a non-JSON seed is a named error rather than a silently broken hydration.
    return { key, seed: canonicalValue(seed, `prefetch(${key})`) ?? null };
  } catch (error) {
    if (!signal.aborted) warn(`[mp-ssr] prefetch for ${key} failed after ${Date.now() - started} ms; rendered without data, the browser fetches it. ${String(error)}`);
    return null;
  } finally {
    if (handle !== undefined) clearTimeout(handle);
  }
}
