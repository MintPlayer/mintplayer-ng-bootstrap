import { act } from 'react';
import * as React from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  BS_THEME_DEFAULT_MODES,
  BsThemeToggle,
  getBsThemeStore,
  useBsTheme,
  type BsThemeToggleMode,
  type UseBsThemeResult,
} from '@mintplayer/react-bootstrap/theming';
import { __resetBsThemeStoreForTests, type MpThemeToggle } from '@mintplayer/web-components/theming';

import { render, renderEl } from './harness';
import { installFakeBroadcastChannel } from '@mintplayer/web-components/theming/src/testing/fake-broadcast-channel';

/**
 * `useBsTheme()` is a thin `useSyncExternalStore` adapter over the shared
 * browser store, and `BsThemeToggle` a `createComponent` wrapper. What can go
 * wrong silently is the adapter plumbing, not the store (which has its own
 * spec in the WC lib):
 *
 *  - a listener that is never released keeps an unmounted component alive and
 *    re-rendering on every theme change;
 *  - a snapshot that is a fresh object per read makes React loop;
 *  - a server render that touches the store throws (the store is browser-only)
 *    or, worse, leaks one request's theme into the next.
 */

const STORE_KEY = Symbol.for('mintplayer.bs-theme');
const hasStore = () => (globalThis as Record<symbol, unknown>)[STORE_KEY] !== undefined;

function clearThemeState(): void {
  __resetBsThemeStoreForTests();
  document.cookie = 'bs-theme-mode=; max-age=0; path=/';
  document.documentElement.removeAttribute('data-bs-theme');
}

// The store opens a BroadcastChannel; the real one crosses worker threads under
// --pool=threads, so another spec file could post a mode into this one. Use the
// in-memory fake, scoped to this file.
installFakeBroadcastChannel();

beforeEach(clearThemeState);
afterEach(clearThemeState);

/** Renders the hook's values as text and hands the latest result to the test. */
function Probe({ onResult }: { onResult: (result: UseBsThemeResult) => void }) {
  const result = useBsTheme();
  onResult(result);
  return (
    <output>
      {result.mode}|{result.effectiveMode}
    </output>
  );
}

describe('useBsTheme', () => {
  it('reads the store on the client', async () => {
    getBsThemeStore().setMode('dark');
    const host = await render(<Probe onResult={() => undefined} />);
    expect(host.textContent).toBe('dark|dark');
  });

  it('subscribes on mount and unsubscribes on unmount', async () => {
    const store = getBsThemeStore();
    const unsubscribe = vi.fn();
    const subscribe = vi.spyOn(store, 'subscribe').mockImplementation(() => unsubscribe);

    await render(<Probe onResult={() => undefined} />);
    expect(subscribe).toHaveBeenCalledTimes(1);
    expect(unsubscribe).not.toHaveBeenCalled();

    await render(<></>);
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('round-trips setMode through the store, the attribute and the render', async () => {
    let latest: UseBsThemeResult | undefined;
    const host = await render(<Probe onResult={(r) => (latest = r)} />);
    expect(host.textContent).toBe('auto|light');

    await act(async () => latest!.setMode('dark'));

    expect(host.textContent).toBe('dark|dark');
    expect(getBsThemeStore().getMode()).toBe('dark');
    expect(document.documentElement.getAttribute('data-bs-theme')).toBe('dark');
  });

  it('re-renders when the mode is changed from outside the hook', async () => {
    const host = await render(<Probe onResult={() => undefined} />);
    await act(async () => getBsThemeStore().setMode('light'));
    expect(host.textContent).toBe('light|light');
  });

  it('keeps setMode stable and the snapshot referentially stable across renders', async () => {
    const results: UseBsThemeResult[] = [];
    await render(<Probe onResult={(r) => results.push(r)} />);
    await render(<Probe onResult={(r) => results.push(r)} />);
    expect(results.length).toBeGreaterThanOrEqual(2);
    expect(results[1].setMode).toBe(results[0].setMode);
    expect(results[1]).toBe(results[0]);
  });

  it('ignores an invalid mode', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    let latest: UseBsThemeResult | undefined;
    const host = await render(<Probe onResult={(r) => (latest = r)} />);

    await act(async () => latest!.setMode('not a mode!'));

    expect(host.textContent).toBe('auto|light');
    warn.mockRestore();
  });

  it('renders the server snapshot on the server without creating the store', () => {
    expect(hasStore()).toBe(false);
    const html = renderToString(<Probe onResult={() => undefined} />);
    // auto, resolved with prefersDark = false: the server cannot see the OS preference.
    expect(html).toContain('auto');
    expect(html).toContain('light');
    expect(hasStore()).toBe(false);
  });
});

describe('BsThemeToggle', () => {
  it('forwards consumer attributes to <mp-theme-toggle>', async () => {
    const el = await renderEl(<BsThemeToggle aria-label="Colour mode" id="theme" />, 'mp-theme-toggle');
    expect(el.getAttribute('aria-label')).toBe('Colour mode');
    expect(el.getAttribute('id')).toBe('theme');
  });

  it('assigns modes as a property, not an attribute', async () => {
    const modes: readonly BsThemeToggleMode[] = [
      ...BS_THEME_DEFAULT_MODES,
      { mode: 'sepia', label: 'Sepia', announcement: 'Sepia mode', icon: 'sepia' },
    ];
    const el = await renderEl<MpThemeToggle>(<BsThemeToggle modes={modes} />, 'mp-theme-toggle');
    expect(el.modes).toEqual(modes);
    expect(el.hasAttribute('modes')).toBe(false);
  });

  it('falls back to the default modes', async () => {
    const el = await renderEl<MpThemeToggle>(<BsThemeToggle />, 'mp-theme-toggle');
    expect(el.modes).toEqual(BS_THEME_DEFAULT_MODES);
  });

  it('restores the default modes when the prop is removed', async () => {
    const modes = BS_THEME_DEFAULT_MODES.slice(0, 2);
    await renderEl<MpThemeToggle>(<BsThemeToggle modes={modes} />, 'mp-theme-toggle');
    const el = await renderEl<MpThemeToggle>(<BsThemeToggle />, 'mp-theme-toggle');
    expect(el.modes).toEqual(BS_THEME_DEFAULT_MODES);
  });

  it('forwards a ref to the element', async () => {
    const ref = React.createRef<MpThemeToggle>();
    const el = await renderEl(<BsThemeToggle ref={ref} />, 'mp-theme-toggle');
    expect(ref.current).toBe(el);
  });
});
