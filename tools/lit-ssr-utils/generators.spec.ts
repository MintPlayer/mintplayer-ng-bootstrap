/**
 * The six chrome generators, driven through their `main()` with the renderer
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

import { main as accordion } from './gen-accordion-chrome.mjs';
import { main as carousel } from './gen-carousel-chrome.mjs';
import { main as dropdown } from './gen-dropdown-chrome.mjs';
import { LIGHT_TIER_COMPONENTS, lightStyleTag, main as lightStyles } from './gen-light-styles-chrome.mjs';
import { main as navbar } from './gen-navbar-chrome.mjs';
import { main as shell } from './gen-shell-chrome.mjs';
import { ChromeGeneratorError, MAX_CHROME_COUNT } from './lib/chrome-module.mjs';

const REPO = resolve('/repo');

/** A lit-like `html` that interpolates to a plain string. */
const html = (strings: TemplateStringsArray, ...values: unknown[]) =>
  strings.reduce((out, s, i) => out + s + (i < values.length ? String(values[i]) : ''), '');

/** Echoes the template back inside a shadow root, the way @lit-labs/ssr wraps real chrome. */
const echo = { html, render: async (tpl: string) => `<x><template shadowrootmode="open">${tpl}</template></x>` };

/** A renderer whose output has no shadow root: the failure every DSD generator must refuse. */
const noShadow = { html, render: async (tpl: string) => tpl };

const dsd = (tpl: string) => `<template shadowrootmode="open">${tpl}</template>`;

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

describe('gen-accordion-chrome', () => {
  it('renders one single-open and one multi variant per tab count, index = count', async () => {
    const h = harness();
    expect(await accordion({ repoRoot: REPO, renderer: echo, ...h })).toBe(0);

    const { path, content } = h.written[0];
    expect(path).toBe(resolve(REPO, 'libs/mintplayer-web-components/accordion/ssr/mp-accordion-chrome.generated.ts'));
    const single = constant(content, 'MP_ACCORDION_DSD_CHROME_BY_COUNT') as string[];
    const multi = constant(content, 'MP_ACCORDION_MULTI_DSD_CHROME_BY_COUNT') as string[];
    expect(single).toHaveLength(MAX_CHROME_COUNT + 1);
    expect(multi).toHaveLength(MAX_CHROME_COUNT + 1);
    expect(single[3]).toBe(dsd('<mp-accordion tab-count=3></mp-accordion>'));
    expect(multi[3]).toBe(dsd('<mp-accordion multi tab-count=3></mp-accordion>'));
    expect(multi[MAX_CHROME_COUNT]).toContain(`tab-count=${MAX_CHROME_COUNT}`);
  });

  it('names its regeneration command in the header and reports what it wrote', async () => {
    const h = harness();
    await accordion({ repoRoot: REPO, renderer: echo, ...h });
    expect(h.written[0].content).toContain('node tools/lit-ssr-utils/gen-accordion-chrome.mjs');
    expect(h.log).toHaveBeenCalledWith(expect.stringMatching(/^gen-accordion-chrome: 26 variants, \d+–\d+ chars$/));
    expect(h.log).toHaveBeenLastCalledWith(`gen-accordion-chrome: wrote ${h.written[0].path}`);
  });

  it('exits 1 and writes nothing when a variant renders no shadow root', async () => {
    const h = harness();
    expect(await accordion({ repoRoot: REPO, renderer: noShadow, ...h })).toBe(1);
    expect(h.write).not.toHaveBeenCalled();
    expect(h.error).toHaveBeenCalledWith(
      'gen-accordion-chrome: no DSD <template> for multi=false tab-count=0:\n',
      '<mp-accordion tab-count=0></mp-accordion>',
    );
  });
});

describe('gen-carousel-chrome', () => {
  it('renders one variant per slide count, index = count', async () => {
    const h = harness();
    expect(await carousel({ repoRoot: REPO, renderer: echo, ...h })).toBe(0);

    const { path, content } = h.written[0];
    expect(path).toBe(resolve(REPO, 'libs/mintplayer-web-components/carousel/ssr/mp-carousel-chrome.generated.ts'));
    const table = constant(content, 'MP_CAROUSEL_DSD_CHROME_BY_COUNT') as string[];
    expect(table).toHaveLength(MAX_CHROME_COUNT + 1);
    expect(table.map((chrome) => chrome.match(/slide-count=(\d+)/)?.[1])).toEqual(
      Array.from({ length: MAX_CHROME_COUNT + 1 }, (_, n) => String(n)),
    );
  });

  it('exits 1 and writes nothing when a variant renders no shadow root', async () => {
    const h = harness();
    expect(await carousel({ repoRoot: REPO, renderer: noShadow, ...h })).toBe(1);
    expect(h.write).not.toHaveBeenCalled();
    expect(h.error.mock.calls[0][0]).toBe('gen-carousel-chrome: no DSD <template> for slide-count=0:\n');
  });
});

describe('gen-dropdown-chrome', () => {
  it('emits the dropdown-menu chrome into the dropdown-menu ssr dir', async () => {
    const h = harness();
    expect(await dropdown({ repoRoot: REPO, renderer: echo, ...h })).toBe(0);

    const { path, content } = h.written[0];
    expect(path).toBe(resolve(REPO, 'libs/mintplayer-web-components/dropdown-menu/ssr/mp-dropdown-chrome.generated.ts'));
    expect(constant(content, 'MP_DROPDOWN_MENU_DSD_CHROME')).toBe(dsd('<mp-dropdown-menu></mp-dropdown-menu>'));
    expect(h.log).toHaveBeenCalledWith(expect.stringMatching(/^gen-dropdown-chrome: <mp-dropdown-menu> chrome \d+ chars$/));
  });

  it('exits 1 naming the element that rendered no shadow root', async () => {
    const h = harness();
    expect(await dropdown({ repoRoot: REPO, renderer: noShadow, ...h })).toBe(1);
    expect(h.error.mock.calls[0][0]).toBe('gen-dropdown-chrome: no DSD <template> for <mp-dropdown-menu>:\n');
  });
});

describe('gen-navbar-chrome', () => {
  it('emits one constant per navbar element, each holding that element\'s own chrome', async () => {
    const h = harness();
    expect(await navbar({ repoRoot: REPO, renderer: echo, ...h })).toBe(0);

    const { path, content } = h.written[0];
    expect(path).toBe(resolve(REPO, 'libs/mintplayer-web-components/navbar/ssr/mp-navbar-chrome.generated.ts'));
    expect(
      Object.fromEntries(
        [
          ['MP_NAVBAR_DSD_CHROME', 'mp-navbar'],
          ['MP_NAVBAR_ITEM_DSD_CHROME', 'mp-navbar-item'],
          ['MP_NAVBAR_BRAND_DSD_CHROME', 'mp-navbar-brand'],
          ['MP_NAVBAR_DROPDOWN_DSD_CHROME', 'mp-navbar-dropdown'],
        ].map(([name, tag]) => [name, constant(content, name) === dsd(`<${tag}></${tag}>`)]),
      ),
    ).toEqual({
      MP_NAVBAR_DSD_CHROME: true,
      MP_NAVBAR_ITEM_DSD_CHROME: true,
      MP_NAVBAR_BRAND_DSD_CHROME: true,
      MP_NAVBAR_DROPDOWN_DSD_CHROME: true,
    });
  });

  it('stops at the first element without a shadow root', async () => {
    const h = harness();
    const render = vi.fn(noShadow.render);
    expect(await navbar({ repoRoot: REPO, renderer: { html, render }, ...h })).toBe(1);
    expect(render).toHaveBeenCalledTimes(1);
  });
});

describe('gen-shell-chrome', () => {
  it('emits the single shell constant and reports its size on the wrote line', async () => {
    const h = harness();
    expect(await shell({ repoRoot: REPO, renderer: echo, ...h })).toBe(0);

    const { path, content } = h.written[0];
    const chrome = dsd('<mp-shell></mp-shell>');
    expect(path).toBe(resolve(REPO, 'libs/mintplayer-web-components/shell/ssr/mp-shell-chrome.generated.ts'));
    expect(constant(content, 'MP_SHELL_DSD_CHROME')).toBe(chrome);
    expect(h.log).toHaveBeenLastCalledWith(`gen-shell-chrome: wrote ${path} (${chrome.length} chars)`);
  });

  it('exits 1 and writes nothing without a shadow root', async () => {
    const h = harness();
    expect(await shell({ repoRoot: REPO, renderer: noShadow, ...h })).toBe(1);
    expect(h.write).not.toHaveBeenCalled();
  });
});

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
