import { afterEach, describe, expect, it, vi } from 'vitest';
import { connectThemeToggle, normaliseModes, toggleEntries } from './theme-toggle';
import { BS_THEME_DEFAULT_MODES, type BsThemeToggleMode } from './toggle-modes';

const entry = (mode: string): BsThemeToggleMode => ({
  mode,
  label: `Switch to ${mode}`,
  announcement: `${mode} on`,
  icon: 'M0 0h16v16H0z',
});

afterEach(() => vi.restoreAllMocks());

describe('normaliseModes', () => {
  it('null and undefined are the default cycle, without a warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(normaliseModes(null)).toBe(BS_THEME_DEFAULT_MODES);
    expect(normaliseModes(undefined)).toBe(BS_THEME_DEFAULT_MODES);
    expect(warn).not.toHaveBeenCalled();
  });

  it('drops invalid entries with one warning, once per list', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const list = [entry('light'), { ...entry('x'), mode: 'x"><script' }, { ...entry('y'), mode: '' }, entry('dark')];
    expect(normaliseModes(list).map((m) => m.mode)).toEqual(['light', 'dark']);
    expect(normaliseModes(list).map((m) => m.mode)).toEqual(['light', 'dark']);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('falls back to the defaults, with a warning, when nothing survives', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(normaliseModes([])).toBe(BS_THEME_DEFAULT_MODES);
    expect(normaliseModes([{ ...entry('bad'), mode: 'bad mode' }])).toBe(BS_THEME_DEFAULT_MODES);
    // Empty: the fallback warning. All invalid: the drop and the fallback.
    expect(warn).toHaveBeenCalledTimes(3);
  });
});

describe('toggleEntries', () => {
  it('shows the current entry and cycles to the next, wrapping', () => {
    const modes = [entry('auto'), entry('light'), entry('dark')];
    expect(toggleEntries(modes, 'light').next.mode).toBe('dark');
    expect(toggleEntries(modes, 'DARK').next.mode).toBe('auto');
  });

  it('a mode not in the list, or none yet, shows entry 0 and cycles to entry 1', () => {
    const modes = [entry('auto'), entry('light')];
    expect(toggleEntries(modes, 'sepia')).toEqual({ current: modes[0], next: modes[1] });
    expect(toggleEntries(modes, null)).toEqual({ current: modes[0], next: modes[1] });
  });

  it('a one-entry list cycles to itself', () => {
    const modes = [entry('dark')];
    expect(toggleEntries(modes, 'dark').next).toBe(modes[0]);
  });
});

describe('connectThemeToggle', () => {
  const view = (over: Partial<Parameters<typeof connectThemeToggle>[0]> = {}) =>
    connectThemeToggle({ id: 'tt', modes: BS_THEME_DEFAULT_MODES, mode: 'light', hydrated: true, announcement: '', ...over });

  it('names the next entry and describes the current one', () => {
    const v = view();
    expect(v.button).toMatchObject({ type: 'button', 'aria-label': 'Switch to dark theme', 'aria-describedby': 'tt-current', disabled: false });
    expect(v.description['id']).toBe('tt-current');
    expect(v.descriptionText).toBe('Light theme');
  });

  it('is disabled until hydrated', () => {
    expect(view({ hydrated: false }).button['disabled']).toBe(true);
  });

  it('hides the icon, and joins a multi-path icon into one path', () => {
    const v = view({ mode: 'dark' });
    expect(v.icon).toMatchObject({ 'aria-hidden': 'true', focusable: 'false' });
    const moon = BS_THEME_DEFAULT_MODES[2].icon as readonly string[];
    expect(v.path['d']).toBe(moon.join(' '));
  });

  it('announces through a polite status region that is not the description', () => {
    const v = view({ announcement: 'Dark theme' });
    expect(v.live).toMatchObject({ role: 'status', 'aria-live': 'polite' });
    expect(v.live['id']).toBeUndefined();
    expect(v.liveText).toBe('Dark theme');
  });

  it('scopes every node', () => {
    const v = view();
    for (const bag of [v.root, v.button, v.icon, v.path, v.description, v.live]) {
      expect(bag['data-mps']).toBe('theme-toggle');
    }
  });
});
