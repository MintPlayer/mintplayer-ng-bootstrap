import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadAllFlags } from './all-flags';
import { flagLoaders } from './flag-loaders.generated';
import { loadFlag } from './load-flag';

describe('loadAllFlags', () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock('./all-flags.generated');
  });

  it('resolves every flag the package ships, in one chunk', async () => {
    const flags = await loadAllFlags();
    const codes = Object.keys(flagLoaders);
    expect(Object.keys(flags)).toHaveLength(codes.length);
    // Both delivery shapes are generated from the same assets dir, so a code
    // present in one and missing from the other is a codegen bug.
    expect(codes.filter((c) => !flags[c])).toEqual([]);
  });

  it('agrees byte-for-byte with the per-flag chunks', async () => {
    const flags = await loadAllFlags();
    for (const code of ['be', 'us', 'io', 'id']) {
      expect(flags[code]).toBe(await loadFlag(code));
    }
  });

  it('returns the same promise for repeat calls (one chunk fetch)', () => {
    expect(loadAllFlags()).toBe(loadAllFlags());
  });

  it('reads undefined for an unknown code', async () => {
    const flags = await loadAllFlags();
    expect(flags['zz']).toBeUndefined();
    expect(flags['']).toBeUndefined();
  });

  it('carries no SVG-internal ids that could collide in a shared shadow root', async () => {
    const flags = await loadAllFlags();
    for (const svg of Object.values(flags)) {
      expect(svg).not.toMatch(/\sid=/);
      expect(svg).not.toContain('url(#');
      expect(svg).not.toContain('<style');
    }
  });

  it('resolves an empty map instead of rejecting when the chunk fails to load', async () => {
    vi.resetModules();
    vi.doMock('./all-flags.generated', () => {
      throw new Error('network');
    });
    const { loadAllFlags: load } = await import('./all-flags');
    await expect(load()).resolves.toEqual({});
    // The failure is not cached: a later call retries rather than poisoning the
    // corpus for the page's lifetime.
    vi.doUnmock('./all-flags.generated');
    vi.resetModules();
  });
});
