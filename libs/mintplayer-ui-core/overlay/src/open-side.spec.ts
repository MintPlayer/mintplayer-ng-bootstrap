import { afterEach, describe, expect, it, vi } from 'vitest';

import { measureOpenSide, openSide, trackOpenSide } from './open-side';

describe('openSide', () => {
  it('opens below when the panel fits there', () => {
    expect(openSide({ top: 100, bottom: 130 }, 200, 800)).toBe('below');
  });

  it('flips above near the viewport bottom when there is more room above', () => {
    expect(openSide({ top: 700, bottom: 730 }, 200, 800)).toBe('above');
  });

  it('stays below when neither side fits and below is roomier', () => {
    expect(openSide({ top: 300, bottom: 330 }, 1000, 800)).toBe('below');
  });
});

describe('measureOpenSide and trackOpenSide', () => {
  const frame = () => new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.replaceChildren();
  });

  /** An anchor near the bottom of the viewport and a panel of the given scroll height. */
  const nodes = (scrollHeight: number, maxHeight = '') => {
    const anchor = document.body.appendChild(document.createElement('button'));
    const panel = document.body.appendChild(document.createElement('div'));
    const bottom = window.innerHeight - 50;
    vi.spyOn(anchor, 'getBoundingClientRect').mockReturnValue({ top: bottom - 30, bottom } as DOMRect);
    Object.defineProperty(panel, 'scrollHeight', { value: scrollHeight });
    panel.style.maxHeight = maxHeight;
    return { anchor, panel };
  };

  it('measures the height the panel wants, capped at its max-height', () => {
    const tall = nodes(400);
    expect(measureOpenSide(tall.anchor, tall.panel)).toBe('above');
    const capped = nodes(400, '30px');
    expect(measureOpenSide(capped.anchor, capped.panel)).toBe('below');
    const bare = document.implementation.createHTMLDocument('');
    expect(measureOpenSide(bare.body, bare.createElement('div'))).toBe('below');
  });

  it('measures once per opening, a frame later, and stops when disposed', async () => {
    const { anchor, panel } = nodes(400);
    let listener: (s: { open: boolean }) => void = () => undefined;
    const unsubscribe = vi.fn();
    const place = vi.fn();
    const stop = trackOpenSide({ subscribe: (fn) => ((listener = fn), unsubscribe), place }, () => anchor, () => panel);
    listener({ open: true });
    listener({ open: true });
    await frame();
    expect(place).toHaveBeenCalledTimes(1);
    expect(place).toHaveBeenCalledWith('above');
    listener({ open: false });
    listener({ open: true });
    stop();
    await frame();
    expect(place).toHaveBeenCalledTimes(1);
    expect(unsubscribe).toHaveBeenCalled();

    const missing = trackOpenSide({ subscribe: (fn) => ((listener = fn), () => undefined), place }, () => null, () => panel);
    listener({ open: true });
    await frame();
    expect(place).toHaveBeenCalledTimes(1);
    missing();
  });
});
