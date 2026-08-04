import { describe, expect, it } from 'vitest';
import { loadFlag } from './load-flag';

describe('loadFlag', () => {
  it('resolves the vendored SVG markup for a known code', async () => {
    const svg = await loadFlag('be');
    expect(svg).toMatch(/^<svg /);
    expect(svg).toContain('viewBox="0 0 513 342"');
  });

  it('is case-insensitive and trims', async () => {
    expect(await loadFlag('  BE ')).toBe(await loadFlag('be'));
  });

  it('returns the same promise for repeat calls (one chunk fetch)', () => {
    expect(loadFlag('fr')).toBe(loadFlag('fr'));
  });

  it('resolves undefined for an unknown code instead of rejecting', async () => {
    await expect(loadFlag('zz')).resolves.toBeUndefined();
    await expect(loadFlag('')).resolves.toBeUndefined();
  });

  it('carries no SVG-internal ids that could collide in a shared shadow root', async () => {
    const svgs = await Promise.all(['be', 'fr', 'us', 'sa', 'rs'].map((c) => loadFlag(c)));
    for (const svg of svgs) {
      expect(svg).not.toMatch(/\sid=/);
      expect(svg).not.toContain('url(#');
      expect(svg).not.toContain('<style');
    }
  });
});
