import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { warnIfColorModeTokenMissing } from './color-mode-warning';

/**
 * The one-time `--mp-color-mode` warning. jsdom loads no stylesheets, so the
 * helper deliberately skips itself under jsdom; each case here presents a
 * browser user agent to get past that guard, and resets the page-wide flag.
 */

const WARNED = Symbol.for('mintplayer.color-mode-warning');
const flagHolder = globalThis as { [WARNED]?: true };

let warn: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  delete flagHolder[WARNED];
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 Chrome/130');
  warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  delete flagHolder[WARNED];
  document.documentElement.style.removeProperty('--mp-color-mode');
});

describe('warnIfColorModeTokenMissing', () => {
  it('warns once per page when the token is not set', () => {
    warnIfColorModeTokenMissing();
    warnIfColorModeTokenMissing();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain('theming/color-mode.css');
  });

  it('stays silent when the token is set on <html>', () => {
    document.documentElement.style.setProperty('--mp-color-mode', 'dark');
    warnIfColorModeTokenMissing();
    expect(warn).not.toHaveBeenCalled();
  });

  it('while the document is still loading, waits for load before checking', () => {
    vi.spyOn(document, 'readyState', 'get').mockReturnValue('loading');
    warnIfColorModeTokenMissing();
    expect(warn).not.toHaveBeenCalled();
    window.dispatchEvent(new Event('load'));
    expect(warn).toHaveBeenCalledTimes(1);
    // The listener is one-shot.
    window.dispatchEvent(new Event('load'));
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('checks against the stylesheet as loaded, not as it was at connect time', () => {
    vi.spyOn(document, 'readyState', 'get').mockReturnValue('interactive');
    warnIfColorModeTokenMissing();
    document.documentElement.style.setProperty('--mp-color-mode', 'light');
    window.dispatchEvent(new Event('load'));
    expect(warn).not.toHaveBeenCalled();
  });

  it('skips itself under jsdom, where no stylesheet ever loads', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 jsdom/26');
    warnIfColorModeTokenMissing();
    expect(warn).not.toHaveBeenCalled();
    // Skipping does not consume the one-time flag.
    expect(flagHolder[WARNED]).toBeUndefined();
  });

  it('skips a document without a usable head (Angular SSR shim)', () => {
    vi.spyOn(document, 'head', 'get').mockReturnValue(null as unknown as HTMLHeadElement);
    warnIfColorModeTokenMissing();
    expect(warn).not.toHaveBeenCalled();
    expect(flagHolder[WARNED]).toBeUndefined();
  });
});
