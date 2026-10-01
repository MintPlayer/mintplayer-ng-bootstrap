import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { unsafeCSS, type CSSResult } from 'lit';

import {
  adoptLightStyles,
  getLightStyleEntries,
  installLightStyles,
} from './install-light-styles';

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

  it('reuses the sheet lit already built for a CSSResult', () => {
    // Lit builds CSSResult.styleSheet only where it detected adoptable sheets
    // at load, which jsdom lacks; model a result from such a browser.
    const sheet = new CSSStyleSheet();
    const styles = { cssText: 'mp-i{color:red}', styleSheet: sheet } as unknown as CSSResult;
    installLightStyles('t-sheet-d', styles);
    const entry = getLightStyleEntries().find((e) => e.key === 't-sheet-d')!;
    expect(entry.sheet).toBe(sheet);
    expect(entry.cssText).toBe('mp-i{color:red}');
  });

  it('builds its own sheet from a CSSResult that has none', () => {
    installLightStyles('t-sheet-f', unsafeCSS('mp-l{color:red}'));
    const entry = getLightStyleEntries().find((e) => e.key === 't-sheet-f')!;
    expect(entry.sheet).toBeInstanceOf(CSSStyleSheet);
    expect(document.adoptedStyleSheets).toContain(entry.sheet);
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
});
