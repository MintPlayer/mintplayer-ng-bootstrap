import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * `preboot.ts` run as SOURCE, against jsdom's real `document` and `window`.
 * preboot.spec.ts proves the generated bundle agrees with the core modules;
 * this proves the entry itself: it runs once, at import, and never throws.
 * Each case re-imports the module fresh so its top-level body runs again.
 */

const META = 'bs-theme-default-mode';

function setCookie(value: string | null): void {
  // Expire whatever the previous case wrote, then write the new pair.
  document.cookie = 'bs-theme-mode=; Path=/; Max-Age=0';
  if (value !== null) document.cookie = `bs-theme-mode=${value}; Path=/`;
}

function setMeta(content: string | null): void {
  document.head.querySelector(`meta[name="${META}"]`)?.remove();
  if (content === null) return;
  const meta = document.createElement('meta');
  meta.setAttribute('name', META);
  meta.setAttribute('content', content);
  document.head.appendChild(meta);
}

function setPrefersDark(dark: boolean | undefined): void {
  const matchMedia =
    dark === undefined
      ? undefined
      : (query: string) => ({ matches: dark && query === '(prefers-color-scheme: dark)' }) as MediaQueryList;
  Object.defineProperty(window, 'matchMedia', { value: matchMedia, configurable: true, writable: true });
}

async function runPreboot(): Promise<string | null> {
  vi.resetModules();
  await import('./preboot');
  return document.documentElement.getAttribute('data-bs-theme');
}

const originalMatchMedia = window.matchMedia;

beforeEach(() => {
  document.documentElement.removeAttribute('data-bs-theme');
  setCookie(null);
  setMeta(null);
});

afterEach(() => {
  setCookie(null);
  setMeta(null);
  document.documentElement.removeAttribute('data-bs-theme');
  Object.defineProperty(window, 'matchMedia', { value: originalMatchMedia, configurable: true, writable: true });
});

describe('preboot.ts (source) — resolution precedence', () => {
  it('with nothing set, follows the OS preference', async () => {
    setPrefersDark(true);
    expect(await runPreboot()).toBe('dark');
  });

  it('with nothing set and a light OS, is light', async () => {
    setPrefersDark(false);
    expect(await runPreboot()).toBe('light');
  });

  it('treats an engine without matchMedia as light', async () => {
    setPrefersDark(undefined);
    expect(await runPreboot()).toBe('light');
  });

  it('a valid cookie wins over the meta default and the OS', async () => {
    setCookie('light');
    setMeta('dark');
    setPrefersDark(true);
    expect(await runPreboot()).toBe('light');
  });

  it('the meta default applies when there is no cookie', async () => {
    setMeta('dark');
    setPrefersDark(false);
    expect(await runPreboot()).toBe('dark');
  });

  it('an invalid cookie falls through to the meta default', async () => {
    setCookie('bad%20value');
    setMeta('dark');
    setPrefersDark(false);
    expect(await runPreboot()).toBe('dark');
  });

  it('an auto cookie resolves against the OS', async () => {
    setCookie('auto');
    setPrefersDark(true);
    expect(await runPreboot()).toBe('dark');
  });

  it('keeps a custom mode as-is', async () => {
    setCookie('sepia');
    setPrefersDark(true);
    expect(await runPreboot()).toBe('sepia');
  });
});

describe('preboot.ts (source) — never blocks the page', () => {
  it('swallows a throwing matchMedia and leaves the attribute unset', async () => {
    Object.defineProperty(window, 'matchMedia', {
      value: () => {
        throw new Error('boom');
      },
      configurable: true,
      writable: true,
    });
    await expect(runPreboot()).resolves.toBeNull();
  });
});
