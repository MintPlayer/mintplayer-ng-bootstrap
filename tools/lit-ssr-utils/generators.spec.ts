/**
 * The chrome generators, driven through their `main()` with the renderer
 * (or, for light styles, the dist loader) injected.
 *
 * What each generator still owns after the loop moved into lib/chrome-module.mjs
 * is its own knowledge: which element it renders, at which attributes, into
 * which constant, and where the module lands. That is what is pinned here. The
 * fake renderer echoes the template it was given inside a DSD template, so each
 * emitted variant names exactly the attributes it was rendered with — an
 * off-by-one count or a swapped radio/checkbox table shows up as a wrong string
 * in a named slot, not as a vaguely different blob.
 *
 * The real render of the real built elements is not here: it needs a WC build
 * and belongs to the SSR/no-JS e2e pass.
 */
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

import { LIGHT_TIER_COMPONENTS, lightStyleTag, main as lightStyles } from './gen-light-styles-chrome.mjs';
import { ChromeGeneratorError } from './lib/chrome-module.mjs';

const REPO = resolve('/repo');

function harness() {
  const written: { path: string; content: string }[] = [];
  const write = vi.fn(async (path: string, content: string) => {
    written.push({ path, content });
  });
  return { written, write, log: vi.fn(), error: vi.fn() };
}

/** The value of `export const NAME ... = <json>;` in a generated module. */
function constant(content: string, name: string): unknown {
  const match = content.match(new RegExp(`export const ${name}(?:: [^=]+)? = (.*);$`, 'm'));
  if (!match) throw new Error(`${name} not found in:\n${content}`);
  return JSON.parse(match[1]);
}

describe('gen-light-styles-chrome', () => {
  const sheet = (name: string) => ({ cssText: `.${name}[data-mps=${name}]{color:red}` });
  /** Every entry's module exports every sheet name, so each component finds its own. */
  const importDist = async (_entry: string) =>
    Object.fromEntries(LIGHT_TIER_COMPONENTS.map(([, key, , exportName]) => [exportName, sheet(key)]));

  it('emits one [tag, scope key, <style>] row per light-tier component', async () => {
    const h = harness();
    expect(await lightStyles({ repoRoot: REPO, importDist, ...h })).toBe(0);

    const { path, content } = h.written[0];
    expect(path).toBe(resolve(REPO, 'libs/mintplayer-web-components/light-dom/ssr/mp-light-styles-chrome.generated.ts'));
    const rows = constant(content, 'MP_LIGHT_STYLE_TAGS') as [string, string, string][];
    expect(rows.map(([tag, key]) => [tag, key])).toEqual(LIGHT_TIER_COMPONENTS.map(([tag, key]) => [tag, key]));
    expect(rows[0][2]).toBe(
      '<style data-mp-light-styles="datatable">.datatable[data-mps=datatable]{color:red}</style>',
    );
  });

  it('loads each component\'s sheet from its own dist entry', async () => {
    const h = harness();
    const spy = vi.fn(importDist);
    await lightStyles({ repoRoot: REPO, importDist: spy, ...h });
    expect(spy.mock.calls.map(([entry]) => entry)).toEqual(LIGHT_TIER_COMPONENTS.map(([, , entry]) => entry));
  });

  it('keeps each scope key equal to the tag minus its mp- prefix, as installLightStyles registers it', () => {
    expect(LIGHT_TIER_COMPONENTS.every(([tag, key]) => tag === `mp-${key}`)).toBe(true);
  });

  it('exits 1 and writes nothing when an entry does not export its sheet', async () => {
    const h = harness();
    const code = await lightStyles({ repoRoot: REPO, importDist: async () => ({}), ...h });
    expect(code).toBe(1);
    expect(h.write).not.toHaveBeenCalled();
    expect(h.error).toHaveBeenCalledWith(
      "gen-light-styles-chrome: datatable's datatableLightStyles is not exported. " +
        "A light-tier component's sheet must be part of its public API.",
    );
  });

  it('propagates a dist that cannot be loaded at all, rather than reporting it as a sheet problem', async () => {
    const h = harness();
    const missing = new Error('Cannot find module dist/.../index.mjs');
    await expect(
      lightStyles({ repoRoot: REPO, importDist: async () => { throw missing; }, ...h }),
    ).rejects.toBe(missing);
  });
});

describe('lightStyleTag', () => {
  it('wraps a CSSResult\'s text in a style tag carrying the scope key', () => {
    expect(lightStyleTag('x', 'tree', { cssText: 'a{}' })).toEqual({
      cssText: 'a{}',
      tag: '<style data-mp-light-styles="tree">a{}</style>',
    });
  });

  it('accepts a plain string sheet too', () => {
    expect(lightStyleTag('x', 'tree', 'b{}').cssText).toBe('b{}');
  });

  it.each([
    ['a missing export', undefined, /not exported/],
    ['an empty sheet, the sign codegen-wc has not run', { cssText: '  \n' }, /is empty — codegen-wc has not run\?/],
    ['a sheet containing </style>, which would close the tag early', { cssText: 'a{content:"</STYLE>"}' }, /contains a <\/style> sequence/],
  ])('refuses %s', (_label, styles, message) => {
    expect(() => lightStyleTag('x', 'k', styles)).toThrow(ChromeGeneratorError);
    expect(() => lightStyleTag('x', 'k', styles)).toThrow(message);
  });
});
