import { describe, expect, it } from 'vitest';

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
