import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import {
  adoptLightStyles,
  collectScopedStyles,
  getLightStyleEntries,
  installLightStyles,
  writeScopedStyleTag,
} from './install-scoped-styles';

// The registry is deliberately global (Symbol.for on globalThis), so each test
// uses its own keys.

const styleFor = (key: string): HTMLStyleElement | null =>
  document.head.querySelector(`style[data-mp-light-styles="${key}"]`);

describe('installLightStyles', () => {
  it('installs once and dedupes by key', () => {
    installLightStyles('t-a', 'mp-a{color:red}');
    installLightStyles('t-a', 'mp-a{color:blue}');
    const entries = getLightStyleEntries().filter((e) => e.key === 't-a');
    expect(entries).toHaveLength(1);
    expect(entries[0].cssText).toBe('mp-a{color:red}');
    // Installed via constructable sheet or the <style> fallback — either way
    // at most one <style> marker exists.
    const markers = document.head.querySelectorAll('style[data-mp-light-styles="t-a"]');
    expect(markers.length).toBeLessThanOrEqual(1);
  });

  it('treats an SSR-emitted <style> marker as already installed', () => {
    const ssr = document.createElement('style');
    ssr.setAttribute('data-mp-light-styles', 't-b');
    ssr.textContent = 'mp-b{color:red}';
    document.head.appendChild(ssr);

    installLightStyles('t-b', 'mp-b{color:red}');
    expect(document.head.querySelectorAll('style[data-mp-light-styles="t-b"]')).toHaveLength(1);
    // …but the registry entry exists for shadow adopters.
    expect(getLightStyleEntries().some((e) => e.key === 't-b')).toBe(true);
  });
});

// #452 §3.1: a Bootstrap part's verbatim variant replaces its scoped variant
// under the same key, and never the other way round.
describe('installLightStyles — replace', () => {
  it('upgrades the installed text in place, keeping one copy', () => {
    installLightStyles('t-r1', '.x:where([data-mps]){color:red}');
    installLightStyles('t-r1', '.x{color:red}', { replace: true });
    const entries = getLightStyleEntries().filter((e) => e.key === 't-r1');
    expect(entries).toHaveLength(1);
    expect(entries[0].cssText).toBe('.x{color:red}');
    expect(document.head.querySelectorAll('style[data-mp-light-styles="t-r1"]').length).toBeLessThanOrEqual(1);
    if (!entries[0].sheet) expect(styleFor('t-r1')?.textContent).toBe('.x{color:red}');
  });

  it('keeps the verbatim copy when the scoped one installs later', () => {
    installLightStyles('t-r2', '.x{color:red}', { replace: true });
    installLightStyles('t-r2', '.x:where([data-mps]){color:red}');
    expect(getLightStyleEntries().find((e) => e.key === 't-r2')?.cssText).toBe('.x{color:red}');
  });

  it('upgrades an SSR-emitted copy', () => {
    const ssr = document.createElement('style');
    ssr.setAttribute('data-mp-light-styles', 't-r3');
    ssr.textContent = '.x:where([data-mps]){color:red}';
    document.head.appendChild(ssr);
    installLightStyles('t-r3', '.x{color:red}', { replace: true });
    expect(document.head.querySelectorAll('style[data-mp-light-styles="t-r3"]')).toHaveLength(1);
    expect(styleFor('t-r3')?.textContent).toBe('.x{color:red}');
  });

  it('writeScopedStyleTag replaces only when asked', () => {
    writeScopedStyleTag(document, 't-r4', 'a');
    expect(writeScopedStyleTag(document, 't-r4', 'b')).toBe(false);
    expect(styleFor('t-r4')?.textContent).toBe('a');
    expect(writeScopedStyleTag(document, 't-r4', 'b', { replace: true })).toBe(true);
    expect(styleFor('t-r4')?.textContent).toBe('b');
  });
});

// #452: Bootstrap parts share one cascade layer, so the registry keeps them in
// stock order whatever the install order (equal-specificity ties).
const orderedKeys = (parent: ParentNode, keys: string[]): string[] =>
  [...parent.querySelectorAll('style[data-mp-light-styles]')]
    .map((el) => el.getAttribute('data-mp-light-styles')!)
    .filter((key) => keys.includes(key));

describe('installLightStyles — order', () => {
  it('writes ordered <style> tags sorted by order, whatever the install order', () => {
    installLightStyles('t-o10', 'a{}', { order: 110 });
    installLightStyles('t-o3', 'b{}', { order: 103 });
    installLightStyles('t-o7', 'c{}', { order: 107 });
    expect(orderedKeys(document.head, ['t-o3', 't-o7', 't-o10'])).toEqual(['t-o3', 't-o7', 't-o10']);
    expect(styleFor('t-o7')?.getAttribute('data-mp-order')).toBe('107');
  });

  it('writeScopedStyleTag (the server DOCUMENT) sorts the same way', () => {
    writeScopedStyleTag(document, 't-w9', 'a{}', { order: 129 });
    writeScopedStyleTag(document, 't-w2', 'b{}', { order: 122 });
    expect(orderedKeys(document.head, ['t-w2', 't-w9'])).toEqual(['t-w2', 't-w9']);
  });

  it('a replacing install keeps the position of the first', () => {
    installLightStyles('t-p5', '.x:where([data-mps]){}', { order: 135 });
    installLightStyles('t-p6', 'y{}', { order: 136 });
    installLightStyles('t-p5', '.x{}', { order: 135, replace: true });
    expect(orderedKeys(document.head, ['t-p5', 't-p6'])).toEqual(['t-p5', 't-p6']);
    expect(styleFor('t-p5')?.textContent).toBe('.x{}');
  });

  it('collectScopedStyles emits ordered sheets sorted, with their order', () => {
    const head = vi.spyOn(document, 'head', 'get').mockReturnValue(null as unknown as HTMLHeadElement);
    installLightStyles('t-s8', 'a{}', { order: 148 });
    installLightStyles('t-s1', 'b{}', { order: 141 });
    head.mockRestore();
    const tags = collectScopedStyles();
    expect(tags.indexOf('"t-s1"')).toBeLessThan(tags.indexOf('"t-s8"'));
    expect(tags).toContain('<style data-mp-light-styles="t-s1" data-mp-order="141">b{}</style>');
  });
});

describe('adoptLightStyles', () => {
  it('mirrors current and future sheets into a shadow root', () => {
    installLightStyles('t-c', 'mp-c{color:red}');

    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = host.attachShadow({ mode: 'open' });
    const dispose = adoptLightStyles(root);

    const inRoot = (key: string): boolean =>
      (root.adoptedStyleSheets?.length ?? 0) > 0
        ? getLightStyleEntries().some((e) => e.key === key && e.sheet && root.adoptedStyleSheets.includes(e.sheet))
        : !!root.querySelector(`style[data-mp-light-styles="${key}"]`);

    expect(inRoot('t-c')).toBe(true);

    // Late registration reaches the already-adopting root.
    installLightStyles('t-d', 'mp-d{color:blue}');
    expect(inRoot('t-d')).toBe(true);

    // After dispose, new registrations stop arriving.
    dispose();
    installLightStyles('t-e', 'mp-e{color:green}');
    expect(inRoot('t-e')).toBe(false);
    host.remove();
  });
});

/**
 * The constructable-sheet path, which every current browser takes. jsdom has
 * `CSSStyleSheet.replaceSync` but not `adoptedStyleSheets`, so the property is
 * provided here as a plain per-node array, which is its entire contract.
 */
describe('installLightStyles — constructable stylesheets', () => {
  const adopted = new WeakMap<object, CSSStyleSheet[]>();
  const accessor: PropertyDescriptor = {
    configurable: true,
    get(this: object) {
      return adopted.get(this) ?? [];
    },
    set(this: object, sheets: CSSStyleSheet[]) {
      adopted.set(this, sheets);
    },
  };

  beforeAll(() => {
    Object.defineProperty(Document.prototype, 'adoptedStyleSheets', accessor);
    Object.defineProperty(ShadowRoot.prototype, 'adoptedStyleSheets', accessor);
  });

  afterAll(() => {
    delete (Document.prototype as { adoptedStyleSheets?: unknown }).adoptedStyleSheets;
    delete (ShadowRoot.prototype as { adoptedStyleSheets?: unknown }).adoptedStyleSheets;
  });

  it('adopts a constructed sheet at document level instead of writing a <style>', () => {
    installLightStyles('t-sheet-a', 'mp-f{color:red}');
    const entry = getLightStyleEntries().find((e) => e.key === 't-sheet-a')!;
    expect(entry.sheet).toBeInstanceOf(CSSStyleSheet);
    expect(document.adoptedStyleSheets).toContain(entry.sheet);
    expect(styleFor('t-sheet-a')).toBeNull();
  });

  it('keeps sheets adopted earlier when adding one', () => {
    installLightStyles('t-sheet-b', 'mp-g{color:red}');
    installLightStyles('t-sheet-c', 'mp-h{color:red}');
    const keys = getLightStyleEntries()
      .filter((e) => e.sheet && document.adoptedStyleSheets.includes(e.sheet))
      .map((e) => e.key);
    expect(keys).toEqual(expect.arrayContaining(['t-sheet-b', 't-sheet-c']));
  });

  it('reuses a sheet the source already built (lit CSSResult shape)', () => {
    // Lit builds CSSResult.styleSheet only where it detected adoptable sheets
    // at load, which jsdom lacks; model a result from such a browser.
    const sheet = new CSSStyleSheet();
    const styles = { cssText: 'mp-i{color:red}', styleSheet: sheet };
    installLightStyles('t-sheet-d', styles);
    const entry = getLightStyleEntries().find((e) => e.key === 't-sheet-d')!;
    expect(entry.sheet).toBe(sheet);
    expect(entry.cssText).toBe('mp-i{color:red}');
  });

  it('builds its own sheet from a source that has none', () => {
    installLightStyles('t-sheet-f', { cssText: 'mp-l{color:red}' });
    const entry = getLightStyleEntries().find((e) => e.key === 't-sheet-f')!;
    expect(entry.sheet).toBeInstanceOf(CSSStyleSheet);
    expect(document.adoptedStyleSheets).toContain(entry.sheet);
  });

  const sheetOf = (key: string) => getLightStyleEntries().find((e) => e.key === key)!.sheet!;

  it('adopts ordered sheets at their sorted position', () => {
    installLightStyles('t-a10', 'a{}', { order: 210 });
    installLightStyles('t-a3', 'b{}', { order: 203 });
    installLightStyles('t-a7', 'c{}', { order: 207 });
    const order = document.adoptedStyleSheets.filter((s) => [sheetOf('t-a3'), sheetOf('t-a7'), sheetOf('t-a10')].includes(s));
    expect(order).toEqual([sheetOf('t-a3'), sheetOf('t-a7'), sheetOf('t-a10')]);
  });

  it('writes a <style> before a later server-rendered part instead of adopting after it', () => {
    // Adopted sheets cascade after every <style>, so a part that must precede
    // a server-rendered (marker <style>) part has to be a <style> too.
    const ssr = document.createElement('style');
    ssr.setAttribute('data-mp-light-styles', 't-ssr5');
    ssr.setAttribute('data-mp-order', '305');
    document.head.appendChild(ssr);
    installLightStyles('t-ssr5', '', { order: 305 });
    installLightStyles('t-c2', 'a{}', { order: 302 });
    installLightStyles('t-c9', 'b{}', { order: 309 });
    expect(orderedKeys(document.head, ['t-c2', 't-ssr5'])).toEqual(['t-c2', 't-ssr5']);
    expect(document.adoptedStyleSheets).not.toContain(sheetOf('t-c2'));
    expect(document.adoptedStyleSheets).toContain(sheetOf('t-c9'));
    expect(styleFor('t-c9')).toBeNull();
  });

  it('mirrors ordered sheets into a shadow root in order', () => {
    installLightStyles('t-m9', 'a{}', { order: 409 });
    installLightStyles('t-m1', 'b{}', { order: 401 });
    const root = document.createElement('div').attachShadow({ mode: 'open' });
    const dispose = adoptLightStyles(root);
    installLightStyles('t-m5', 'c{}', { order: 405 });
    const order = root.adoptedStyleSheets.filter((s) => [sheetOf('t-m1'), sheetOf('t-m5'), sheetOf('t-m9')].includes(s));
    expect(order).toEqual([sheetOf('t-m1'), sheetOf('t-m5'), sheetOf('t-m9')]);
    dispose();
  });

  it('mirrors sheets into a shadow root once, without duplicates', () => {
    installLightStyles('t-sheet-e', 'mp-j{color:red}');
    const host = document.createElement('div');
    const root = host.attachShadow({ mode: 'open' });
    const disposeA = adoptLightStyles(root);
    const disposeB = adoptLightStyles(root);
    const sheet = getLightStyleEntries().find((e) => e.key === 't-sheet-e')!.sheet!;
    expect(root.adoptedStyleSheets.filter((s) => s === sheet)).toHaveLength(1);
    disposeA();
    disposeB();
  });
});

describe('installLightStyles — SSR guard', () => {
  it('does nothing on a document without a head (SSR DOM shim)', () => {
    const head = vi.spyOn(document, 'head', 'get').mockReturnValue(null as unknown as HTMLHeadElement);
    installLightStyles('t-ssr', 'mp-k{color:red}');
    head.mockRestore();
    expect(getLightStyleEntries().some((e) => e.key === 't-ssr')).toBe(false);
  });

  it('records the sheet for collectScopedStyles, once per key, with </style> neutralised', () => {
    const head = vi.spyOn(document, 'head', 'get').mockReturnValue(null as unknown as HTMLHeadElement);
    installLightStyles('t-srv', 'mp-s{content:"</style>"}');
    installLightStyles('t-srv', 'mp-s{color:blue}');
    head.mockRestore();
    const tags = collectScopedStyles();
    expect(tags).toContain('<style data-mp-light-styles="t-srv">mp-s{content:"<\\/style>"}</style>');
    expect(tags).not.toContain('color:blue');
  });
});
