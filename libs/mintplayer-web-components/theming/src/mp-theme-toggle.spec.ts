import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MpThemeToggle } from './index';
import { __resetBsThemeStoreForTests, getBsThemeStore, type BsThemeToggleMode } from '@mintplayer/ui-core/theming';
import { installFakeBroadcastChannel } from '@mintplayer/ui-core/theming/src/testing/fake-broadcast-channel';

void MpThemeToggle; // force the side-effect registration

/**
 * The Lit theme toggle (#437): light DOM, rendered from the template compiled
 * out of `@mintplayer/ui-core/theming`. The core's spec covers the bags and
 * the modes list; this file pins the element against the real store.
 */

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

function stubMatchMedia(): void {
  const mql = { matches: false, media: '(prefers-color-scheme: dark)', addEventListener: () => undefined, removeEventListener: () => undefined };
  Object.defineProperty(window, 'matchMedia', { configurable: true, writable: true, value: vi.fn(() => mql as unknown as MediaQueryList) });
}

async function mount(modes?: readonly BsThemeToggleMode[]): Promise<MpThemeToggle> {
  const host = document.createElement('mp-theme-toggle') as MpThemeToggle;
  if (modes) host.modes = modes;
  document.body.append(host);
  await host.updateComplete;
  await host.updateComplete;
  return host;
}

const button = (host: MpThemeToggle) => host.querySelector('button') as HTMLButtonElement;
const liveRegion = (host: MpThemeToggle) => host.querySelector('[aria-live]') as HTMLElement;

async function click(host: MpThemeToggle): Promise<void> {
  button(host).click();
  await host.updateComplete;
}

const entry = (mode: string): BsThemeToggleMode => ({ mode, label: `Switch to ${mode}`, announcement: `${mode} on`, icon: 'M0 0h16v16H0z' });

// The store opens a BroadcastChannel; the real one crosses worker threads under
// --pool=threads, so another spec file could post a mode into this one.
installFakeBroadcastChannel();

describe('mp-theme-toggle', () => {
  beforeEach(() => {
    __resetBsThemeStoreForTests();
    document.body.innerHTML = '';
    document.documentElement.removeAttribute('data-bs-theme');
    stubCookie();
    stubMatchMedia();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    __resetBsThemeStoreForTests();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders a native button in the light DOM, its description beside it', async () => {
    const host = await mount();
    expect(host.shadowRoot).toBeNull();
    expect(button(host).type).toBe('button');
    expect(button(host).disabled).toBe(false);
    const described = host.querySelector(`#${button(host).getAttribute('aria-describedby')}`);
    expect(described?.textContent).toBe('Auto theme');
    expect(host.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('cycles auto -> light -> dark -> auto, naming the next entry and describing the current one', async () => {
    const host = await mount();
    const store = getBsThemeStore();
    expect(button(host).getAttribute('aria-label')).toBe('Switch to light theme');
    await click(host);
    expect(store.getMode()).toBe('light');
    expect(button(host).getAttribute('aria-label')).toBe('Switch to dark theme');
    await click(host);
    expect(store.getMode()).toBe('dark');
    await click(host);
    expect(store.getMode()).toBe('auto');
  });

  it('follows a custom modes list', async () => {
    stubCookie('bs-theme-mode=light');
    const host = await mount([entry('dark'), entry('light'), entry('sepia')]);
    await click(host);
    expect(getBsThemeStore().getMode()).toBe('sepia');
    await click(host);
    expect(getBsThemeStore().getMode()).toBe('dark');
  });

  it('announces the new entry once, and the region clears itself', async () => {
    vi.useFakeTimers();
    const host = await mount();
    await click(host);
    expect(liveRegion(host).textContent).toBe('Light theme');
    vi.runAllTimers();
    await host.updateComplete;
    expect(liveRegion(host).textContent).toBe('');
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
