import { describe, expect, it, vi } from 'vitest';
import {
  canonicalJson,
  createTransferStore,
  escapeScriptJson,
  hashKey,
  NonJsonValueError,
  readTransferState,
  runPrefetch,
  serializeTransferState,
} from './index';

describe('canonicalJson', () => {
  it('sorts keys at every depth and drops undefined properties', () => {
    expect(canonicalJson({ b: 1, a: { d: [1, undefined], c: undefined } })).toBe('{"a":{"d":[1,null]},"b":1}');
    expect(canonicalJson({ x: 1, y: 2 })).toBe(canonicalJson({ y: 2, x: 1 }));
  });

  it('throws a named error with the path for anything that is not JSON', () => {
    const cases: [unknown, string][] = [
      [{ since: new Date(0) }, 'fetchParams.since'],
      [{ cb: () => 1 }, 'fetchParams.cb'],
      [{ list: [1, NaN] }, 'fetchParams.list[1]'],
      [{ m: new Map() }, 'fetchParams.m'],
    ];
    cases.map(([value, path]) => {
      const error = (() => {
        try {
          canonicalJson(value, 'fetchParams');
          return null;
        } catch (e) {
          return e;
        }
      })();
      expect(error).toBeInstanceOf(NonJsonValueError);
      expect((error as NonJsonValueError).path).toBe(path);
    });
  });

  it('rejects a cycle but accepts the same object twice', () => {
    const shared = { a: 1 };
    expect(canonicalJson({ x: shared, y: shared })).toBe('{"x":{"a":1},"y":{"a":1}}');
    const cyclic: Record<string, unknown> = {};
    cyclic['self'] = cyclic;
    expect(() => canonicalJson(cyclic)).toThrow(NonJsonValueError);
  });

  it('hashes stably and distinguishes nearby keys', () => {
    expect(hashKey('abc')).toBe(hashKey('abc'));
    expect(hashKey('abc')).not.toBe(hashKey('abd'));
  });
});

describe('transfer store', () => {
  it('serializes into a script that cannot be broken out of, and reads back', () => {
    // The two line separators built from char codes: as literals they end a regex or string in some toolchains.
    const separators = String.fromCharCode(0x2028, 0x2029);
    const hostile = `</script><!-- & ${separators}`;
    const store = createTransferStore();
    store.set('k', { html: hostile });
    const script = serializeTransferState(store);
    expect(script).not.toMatch(/<\/script>.*<\/script>/s);
    const json = script.slice(script.indexOf('>') + 1, script.lastIndexOf('</script>'));
    expect([...'<>&', ...separators].filter((c) => json.includes(c))).toEqual([]);
    const doc = { getElementById: (id: string) => (id === 'mp-state' ? ({ textContent: json } as HTMLElement) : null) };
    expect(readTransferState(doc).get('k')).toEqual({ html: hostile });
  });

  it('reads an empty store when there is no script or it is not an object', () => {
    expect(readTransferState(null).get('k')).toBeUndefined();
    const doc = { getElementById: () => ({ textContent: '[1]' }) as HTMLElement };
    expect(readTransferState(doc).get('0')).toBeUndefined();
  });

  it('escapes exactly the html-significant characters', () => {
    expect(escapeScriptJson('"<a>&"')).toBe('"\\u003Ca\\u003E\\u0026"');
  });
});

describe('runPrefetch', () => {
  const core = (prefetch: (signal: AbortSignal) => Promise<unknown> | undefined, key: string | null = 'k') => ({
    transferKey: () => key ?? undefined,
    prefetch: (_inputs: unknown, signal: AbortSignal) => prefetch(signal),
  });

  it('resolves the seed in canonical form under its key', async () => {
    expect(await runPrefetch(core(() => Promise.resolve({ b: 1, a: 2 })), {})).toEqual({ key: 'k', seed: { a: 2, b: 1 } });
  });

  it('resolves null without a key, without a prefetch, or when the core has nothing to fetch', async () => {
    expect(await runPrefetch(core(() => Promise.resolve(1), null), {})).toBeNull();
    expect(await runPrefetch({ transferKey: () => 'k' }, {})).toBeNull();
    expect(await runPrefetch(core(() => undefined), {})).toBeNull();
  });

  it('aborts the fetch and resolves null after the timeout', async () => {
    vi.useFakeTimers();
    try {
      const warn = vi.fn();
      let seen: AbortSignal | null = null;
      const pending = runPrefetch(
        core((signal) => {
          seen = signal;
          return new Promise(() => undefined);
        }),
        {},
        { timeout: 50, warn },
      );
      await vi.advanceTimersByTimeAsync(50);
      expect(await pending).toBeNull();
      expect(seen!.aborted).toBe(true);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('timed out after 50 ms'));
    } finally {
      vi.useRealTimers();
    }
  });

  it('resolves null and warns when the fetch fails, and stays silent when the render aborted it', async () => {
    const warn = vi.fn();
    expect(await runPrefetch(core(() => Promise.reject(new Error('503'))), {}, { warn })).toBeNull();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('503'));

    const quiet = vi.fn();
    const render = new AbortController();
    render.abort();
    expect(await runPrefetch(core((signal) => (signal.aborted ? Promise.reject(signal.reason) : Promise.resolve(1))), {}, { signal: render.signal, warn: quiet })).toBeNull();
    expect(quiet).not.toHaveBeenCalled();
  });

  it('refuses a seed that is not JSON rather than transferring it', async () => {
    const warn = vi.fn();
    expect(await runPrefetch(core(() => Promise.resolve({ at: new Date(0) })), {}, { warn })).toBeNull();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('a Date'));
  });
});
