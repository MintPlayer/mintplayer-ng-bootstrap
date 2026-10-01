import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, effectScope, h, nextTick } from 'vue';

import BsThemeToggle from '../../theming/src/BsThemeToggle.vue';
import { useBsTheme, type UseBsThemeResult } from '../../theming/src/useBsTheme';
import {
  __resetBsThemeStoreForTests,
  BS_THEME_DEFAULT_MODES,
  getBsThemeStore,
  type BsThemeToggleMode,
  type MpThemeToggle,
} from '@mintplayer/web-components/theming';

import { mountEl, mountWrapper } from './harness';
import { installFakeBroadcastChannel } from '@mintplayer/web-components/theming/src/testing/fake-broadcast-channel';

/**
 * `useBsTheme()` mirrors the shared browser store into `shallowRef`s and
 * `BsThemeToggle` forwards attributes and a `modes` array to
 * `<mp-theme-toggle>`. The store itself has its own spec in the WC lib; what
 * fails silently here is the adapter plumbing:
 *
 *  - a subscription that outlives its scope keeps writing into refs nobody
 *    reads, one leak per mounted component;
 *  - a composable that touches the store on the server throws (the store is
 *    browser-only) or leaks one request's theme into the next;
 *  - an array prop pushed as an attribute arrives as "[object Object]".
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
afterEach(() => {
  vi.unstubAllGlobals();
  clearThemeState();
});

const Probe = defineComponent({
  setup() {
    const theme = useBsTheme();
    return () => h('output', `${theme.mode.value}|${theme.effectiveMode.value}`);
  },
});

describe('useBsTheme', () => {
  it('subscribes in its scope and unsubscribes when the scope is disposed', () => {
    const store = getBsThemeStore();
    const unsubscribe = vi.fn();
    const subscribe = vi.spyOn(store, 'subscribe').mockImplementation(() => unsubscribe);

    const scope = effectScope();
    scope.run(() => useBsTheme());
    expect(subscribe).toHaveBeenCalledTimes(1);
    expect(unsubscribe).not.toHaveBeenCalled();

    scope.stop();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('releases the subscription when the component unmounts', () => {
    const store = getBsThemeStore();
    const unsubscribe = vi.fn();
    vi.spyOn(store, 'subscribe').mockImplementation(() => unsubscribe);

    const wrapper = mountWrapper(Probe);
    expect(unsubscribe).not.toHaveBeenCalled();
    wrapper.unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('syncs immediately outside a component', () => {
    getBsThemeStore().setMode('dark');
    const scope = effectScope();
    const theme = scope.run(() => useBsTheme())!;
    expect(theme.mode.value).toBe('dark');
    expect(theme.effectiveMode.value).toBe('dark');
    scope.stop();
  });

  it('shows the store mode once mounted', async () => {
    getBsThemeStore().setMode('dark');
    const wrapper = mountWrapper(Probe);
    await nextTick();
    expect(wrapper.text()).toBe('dark|dark');
  });

  it('round-trips setMode through the store, the attribute and the refs', async () => {
    const scope = effectScope();
    const theme = scope.run(() => useBsTheme()) as UseBsThemeResult;
    expect(theme.mode.value).toBe('auto');
    expect(theme.effectiveMode.value).toBe('light');

    theme.setMode('dark');

    expect(theme.mode.value).toBe('dark');
    expect(theme.effectiveMode.value).toBe('dark');
    expect(getBsThemeStore().getMode()).toBe('dark');
    expect(document.documentElement.getAttribute('data-bs-theme')).toBe('dark');
    scope.stop();
  });

  it('re-renders a component when the mode changes from outside', async () => {
    const wrapper = mountWrapper(Probe);
    getBsThemeStore().setMode('light');
    await nextTick();
    expect(wrapper.text()).toBe('light|light');
  });

  it('stops updating after its scope is disposed', () => {
    const scope = effectScope();
    const theme = scope.run(() => useBsTheme())!;
    scope.stop();

    getBsThemeStore().setMode('dark');
    expect(theme.mode.value).toBe('auto');
  });

  it('can be stopped by hand when called outside any scope', () => {
    const theme = useBsTheme();
    getBsThemeStore().setMode('dark');
    expect(theme.mode.value).toBe('dark');

    theme.stop();
    theme.stop(); // idempotent
    getBsThemeStore().setMode('light');
    expect(theme.mode.value).toBe('dark');
  });

  it('exposes readonly refs', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const scope = effectScope();
    const theme = scope.run(() => useBsTheme())!;
    (theme.mode as { value: string }).value = 'dark';
    expect(theme.mode.value).toBe('auto');
    scope.stop();
    warn.mockRestore();
  });

  it('never touches the store on the server', () => {
    vi.stubGlobal('window', undefined);
    const scope = effectScope();
    const theme = scope.run(() => useBsTheme())!;

    // auto, resolved with prefersDark = false: the server cannot see the OS preference.
    expect(theme.mode.value).toBe('auto');
    expect(theme.effectiveMode.value).toBe('light');
    theme.setMode('dark');
    expect(hasStore()).toBe(false);
    scope.stop();
  });
});

describe('BsThemeToggle', () => {
  it('forwards consumer attributes to <mp-theme-toggle>', () => {
    const { el } = mountEl(BsThemeToggle, 'mp-theme-toggle', {
      attrs: { 'aria-label': 'Colour mode', id: 'theme' },
    });
    expect(el.getAttribute('aria-label')).toBe('Colour mode');
    expect(el.getAttribute('id')).toBe('theme');
  });

  it('assigns modes as a property, not an attribute', () => {
    const modes: readonly BsThemeToggleMode[] = [
      ...BS_THEME_DEFAULT_MODES,
      { mode: 'sepia', label: 'Sepia', announcement: 'Sepia mode', icon: 'sepia' },
    ];
    const { el } = mountEl<MpThemeToggle>(BsThemeToggle, 'mp-theme-toggle', { props: { modes } });
    expect(el.modes).toEqual(modes);
    expect(el.hasAttribute('modes')).toBe(false);
  });

  it('falls back to the default modes', () => {
    const { el } = mountEl<MpThemeToggle>(BsThemeToggle, 'mp-theme-toggle');
    expect(el.modes).toEqual(BS_THEME_DEFAULT_MODES);
  });

  it('pushes a changed modes prop and restores the default when it is cleared', async () => {
    const modes = BS_THEME_DEFAULT_MODES.slice(0, 2);
    const { wrapper, el } = mountEl<MpThemeToggle>(BsThemeToggle, 'mp-theme-toggle');

    await wrapper.setProps({ modes });
    expect(el.modes).toEqual(modes);

    await wrapper.setProps({ modes: undefined });
    expect(el.modes).toEqual(BS_THEME_DEFAULT_MODES);
  });
});
