import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import './mp-theme-toggle';
import type { MpThemeToggle } from './mp-theme-toggle';
import { __resetBsThemeStoreForTests, getBsThemeStore } from '../store';
import { BS_THEME_DEFAULT_MODES } from '../toggle-modes';

/**
 * Roles, names and state for <mp-theme-toggle> (PRD dark-mode D7): a native
 * button named by the NEXT entry's label and described by an in-shadow node
 * holding the CURRENT entry's announcement, both rewritten in the same render.
 */
function stubEnvironment(cookie = ''): void {
  let jar = cookie;
  Object.defineProperty(document, 'cookie', {
    configurable: true,
    get: () => jar,
    set: (value: string) => {
      jar = value.split(';')[0];
    },
  });
  const mql = { matches: false, addEventListener: () => undefined, removeEventListener: () => undefined };
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn(() => mql as unknown as MediaQueryList),
  });
}

async function mount(): Promise<MpThemeToggle> {
  document.body.innerHTML = '<mp-theme-toggle></mp-theme-toggle>';
  const host = document.querySelector('mp-theme-toggle') as MpThemeToggle;
  await host.updateComplete;
  return host;
}

const button = (host: MpThemeToggle) => host.shadowRoot!.querySelector('button') as HTMLButtonElement;

/** The description text, resolved through the button's IDREF inside the same shadow root. */
function description(host: MpThemeToggle): string | null {
  const id = button(host).getAttribute('aria-describedby');
  if (!id) return null;
  return host.shadowRoot!.getElementById(id)?.textContent ?? null;
}

describe('mp-theme-toggle aria', () => {
  beforeEach(() => {
    __resetBsThemeStoreForTests();
    stubEnvironment();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    __resetBsThemeStoreForTests();
    vi.restoreAllMocks();
  });

  it('renders a native button of type button', async () => {
    const host = await mount();
    const btn = button(host);
    expect(btn.tagName).toBe('BUTTON');
    expect(btn.type).toBe('button');
    expect(btn.hasAttribute('role')).toBe(false);
    expect(btn.hasAttribute('aria-pressed')).toBe(false);
  });

  it('has a non-empty name in every state, equal to the next entry label', async () => {
    const host = await mount();
    const names: (string | null)[] = [];
    const step = async () => {
      names.push(button(host).getAttribute('aria-label'));
      button(host).click();
      await host.updateComplete;
    };
    await BS_THEME_DEFAULT_MODES.reduce((chain) => chain.then(step), Promise.resolve());
    expect(names.every((name) => !!name && name.trim().length > 0)).toBe(true);
    // Starting at auto: the button names light, then dark, then auto.
    expect(names).toEqual(['Switch to light theme', 'Switch to dark theme', 'Switch to auto theme']);
  });

  it('names the next entry and describes the current one after each click, in the same render', async () => {
    const host = await mount();
    expect(description(host)).toBe('Auto theme');

    button(host).click();
    await host.updateComplete;
    expect(getBsThemeStore().getMode()).toBe('light');
    expect(button(host).getAttribute('aria-label')).toBe('Switch to dark theme');
    expect(description(host)).toBe('Light theme');

    button(host).click();
    await host.updateComplete;
    expect(button(host).getAttribute('aria-label')).toBe('Switch to auto theme');
    expect(description(host)).toBe('Dark theme');
  });

  it('keeps the description node in the same shadow root as the button', async () => {
    const host = await mount();
    const id = button(host).getAttribute('aria-describedby')!;
    const node = host.shadowRoot!.getElementById(id);
    expect(node).not.toBeNull();
    expect(node!.getRootNode()).toBe(host.shadowRoot);
    expect(node!.hasAttribute('aria-live')).toBe(false);
  });

  it('hides every icon from the accessibility tree and the tab order', async () => {
    const host = await mount();
    const icons = [...host.shadowRoot!.querySelectorAll('svg')];
    expect(icons.length).toBe(1);
    expect(icons.every((icon) => icon.getAttribute('aria-hidden') === 'true')).toBe(true);
    expect(icons.every((icon) => icon.getAttribute('focusable') === 'false')).toBe(true);
  });

  it('renders one path per icon path (moon-stars-fill has two)', async () => {
    stubEnvironment('bs-theme-mode=dark');
    __resetBsThemeStoreForTests();
    const host = await mount();
    expect(host.shadowRoot!.querySelectorAll('svg path').length).toBe(2);
  });

  it('announces through a polite live region that is not the description', async () => {
    const host = await mount();
    button(host).click();
    await host.updateComplete;
    const region = host.shadowRoot!.querySelector('[aria-live]') as HTMLElement;
    expect(region.getAttribute('aria-live')).toBe('polite');
    expect(region.textContent).toBe('Light theme');
    expect(region.id).not.toBe(button(host).getAttribute('aria-describedby'));
  });
});
