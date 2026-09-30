import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import './mp-theme-toggle';
import type { MpThemeToggle } from './mp-theme-toggle';
import { __resetBsThemeStoreForTests, getBsThemeStore } from '../store';
import { BS_THEME_DEFAULT_MODES, type BsThemeToggleMode } from '../toggle-modes';
import { installFakeBroadcastChannel } from '../testing/fake-broadcast-channel';

/** A cookie jar that keeps the last written pair (the store's cookie write). */
function stubCookie(initial = ''): void {
  let jar = initial;
  Object.defineProperty(document, 'cookie', {
    configurable: true,
    get: () => jar,
    set: (value: string) => {
      jar = value.split(';')[0];
    },
  });
}

function stubMatchMedia(prefersDark: boolean): void {
  const mql = {
    matches: prefersDark,
    media: '(prefers-color-scheme: dark)',
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  };
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn(() => mql as unknown as MediaQueryList),
  });
}

async function mount(modes?: readonly BsThemeToggleMode[]): Promise<MpThemeToggle> {
  const host = document.createElement('mp-theme-toggle');
  if (modes) host.modes = modes;
  document.body.append(host);
  await host.updateComplete;
  return host;
}

const button = (host: MpThemeToggle) => host.shadowRoot!.querySelector('button') as HTMLButtonElement;
const liveRegion = (host: MpThemeToggle) => host.shadowRoot!.querySelector('[aria-live]') as HTMLElement;

async function click(host: MpThemeToggle): Promise<void> {
  button(host).click();
  await host.updateComplete;
}

const entry = (mode: string): BsThemeToggleMode => ({
  mode,
  label: `Switch to ${mode}`,
  announcement: `${mode} on`,
  icon: 'M0 0h16v16H0z',
});

// The store opens a BroadcastChannel; the real one crosses worker threads under
// --pool=threads, so another spec file could post a mode into this one. Use the
// in-memory fake, scoped to this file.
installFakeBroadcastChannel();

describe('mp-theme-toggle', () => {
  beforeEach(() => {
    __resetBsThemeStoreForTests();
    document.body.innerHTML = '';
    document.documentElement.removeAttribute('data-bs-theme');
    stubCookie();
    stubMatchMedia(false);
  });

  afterEach(() => {
    document.body.innerHTML = '';
    __resetBsThemeStoreForTests();
    vi.restoreAllMocks();
  });

  it('defaults to BS_THEME_DEFAULT_MODES', async () => {
    const host = await mount();
    expect(host.modes).toBe(BS_THEME_DEFAULT_MODES);
  });

  it('cycles auto -> light -> dark -> auto in array order', async () => {
    const host = await mount();
    const store = getBsThemeStore();
    expect(store.getMode()).toBe('auto');

    await click(host);
    expect(store.getMode()).toBe('light');
    await click(host);
    expect(store.getMode()).toBe('dark');
    await click(host);
    expect(store.getMode()).toBe('auto');
  });

  it('follows a custom array order', async () => {
    stubCookie('bs-theme-mode=light');
    const host = await mount([entry('dark'), entry('light'), entry('sepia')]);

    await click(host);
    expect(getBsThemeStore().getMode()).toBe('sepia');
    await click(host);
    expect(getBsThemeStore().getMode()).toBe('dark');
  });

  it('a current mode not in the list shows entry 0 and cycles to entry 1', async () => {
    stubCookie('bs-theme-mode=sepia');
    const host = await mount();
    expect(getBsThemeStore().getMode()).toBe('sepia');
    // Entry 0 (auto) is shown, so the button names entry 1 (light).
    expect(button(host).getAttribute('aria-label')).toBe('Switch to light theme');

    await click(host);
    expect(getBsThemeStore().getMode()).toBe('light');
  });

  it('drops invalid entries with a warning', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const host = await mount([
      entry('light'),
      { ...entry('x"><script'), mode: 'x"><script' },
      { ...entry(''), mode: '' },
      entry('dark'),
    ]);
    expect(host.modes.map((m) => m.mode)).toEqual(['light', 'dark']);
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it('falls back to the defaults, with a warning, when no entry survives validation', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const host = await mount([{ ...entry('bad mode'), mode: 'bad mode' }]);
    expect(host.modes).toBe(BS_THEME_DEFAULT_MODES);
    expect(button(host)).not.toBeNull();
    // One warning for the dropped entry, one for the fallback.
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it('falls back to the defaults, with a warning, for an empty list', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const host = await mount([]);
    expect(host.modes).toBe(BS_THEME_DEFAULT_MODES);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('resets to the defaults for null and undefined, without a warning', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const host = await mount([entry('light'), entry('dark')]);
    host.modes = null as unknown as readonly BsThemeToggleMode[];
    expect(host.modes).toBe(BS_THEME_DEFAULT_MODES);
    host.modes = [entry('light')];
    host.modes = undefined as unknown as readonly BsThemeToggleMode[];
    expect(host.modes).toBe(BS_THEME_DEFAULT_MODES);
    expect(warn).not.toHaveBeenCalled();
  });

  it('a click calls setMode on the store with the next mode', async () => {
    const host = await mount();
    const setMode = vi.spyOn(getBsThemeStore(), 'setMode');
    await click(host);
    expect(setMode).toHaveBeenCalledWith('light');
  });

  it('announces the new entry after a click', async () => {
    const host = await mount();
    await click(host);
    expect(liveRegion(host).textContent).toBe('Light theme');
  });

  it('re-renders when the store changes from elsewhere', async () => {
    const host = await mount();
    getBsThemeStore().setMode('dark');
    await host.updateComplete;
    expect(button(host).getAttribute('aria-label')).toBe('Switch to auto theme');
  });

  it('unsubscribes on disconnect', async () => {
    const host = await mount();
    host.remove();
    const before = button(host).getAttribute('aria-label');
    getBsThemeStore().setMode('dark');
    await host.updateComplete;
    expect(button(host).getAttribute('aria-label')).toBe(before);
  });
});
