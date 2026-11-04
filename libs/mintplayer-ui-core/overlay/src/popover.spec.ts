import { afterEach, describe, expect, it, vi } from 'vitest';
import { placePopover, trackPopovers } from './popover';

const rect = (left: number, top: number, width: number, height: number) =>
  ({ left, top, width, height, right: left + width, bottom: top + height, x: left, y: top, toJSON: () => ({}) }) as DOMRect;
const frame = () => new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
const toggle = (panel: HTMLElement, newState: 'open' | 'closed') => panel.dispatchEvent(Object.assign(new Event('toggle'), { newState }));
const prop = (el: HTMLElement, name: string) => el.style.getPropertyValue(name);

afterEach(() => {
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

function boxes(anchorTop = 100) {
  const anchor = document.body.appendChild(document.createElement('button'));
  const panel = document.body.appendChild(document.createElement('div'));
  const at = { top: anchorTop };
  vi.spyOn(anchor, 'getBoundingClientRect').mockImplementation(() => rect(50, at.top, 120, 30));
  vi.spyOn(panel, 'getBoundingClientRect').mockReturnValue(rect(0, 0, 100, 200));
  return { anchor, panel, at };
}

describe('placePopover', () => {
  it('places below the anchor, at least as wide as it, and flips above near the bottom', () => {
    const { anchor, panel, at } = boxes();
    placePopover(panel, anchor, { matchAnchorWidth: true });
    expect([prop(panel, '--mp-popover-left'), prop(panel, '--mp-popover-top'), prop(panel, '--mp-popover-min-width')]).toEqual(['50px', '132px', '120px']);
    at.top = window.innerHeight - 40;
    placePopover(panel, anchor);
    expect(prop(panel, '--mp-popover-top')).toBe(`${window.innerHeight - 40 - 2 - 200}px`);
  });

  it('leaves the panel alone with no position to try, or no window', () => {
    const { anchor, panel } = boxes();
    placePopover(panel, anchor, { positions: [] });
    expect(prop(panel, '--mp-popover-top')).toBe('');
    const bare = document.implementation.createHTMLDocument('');
    const loose = bare.createElement('div');
    placePopover(loose, bare.createElement('button'));
    expect(loose.getAttribute('style')).toBeNull();
  });
});

describe('trackPopovers', () => {
  it('places a panel as it opens and again on scroll, until it closes', async () => {
    const { anchor, panel, at } = boxes();
    const stray = document.body.appendChild(document.createElement('div'));
    const stop = trackPopovers(document.body, (p) => (p === panel ? anchor : null));
    toggle(stray, 'open');
    expect(prop(stray, '--mp-popover-top')).toBe('');
    toggle(panel, 'open');
    expect(prop(panel, '--mp-popover-top')).toBe('132px');

    at.top = 300;
    window.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('resize'));
    await frame();
    expect(prop(panel, '--mp-popover-top')).toBe('332px');

    toggle(panel, 'closed');
    toggle(panel, 'closed');
    at.top = 10;
    window.dispatchEvent(new Event('scroll'));
    await frame();
    expect(prop(panel, '--mp-popover-top')).toBe('332px');
    stop();
  });

  it('ignores panels outside its root, and cleans up while open', () => {
    const { anchor, panel } = boxes();
    const root = document.body.appendChild(document.createElement('section'));
    const inner = root.appendChild(document.createElement('div'));
    vi.spyOn(inner, 'getBoundingClientRect').mockReturnValue(rect(0, 0, 10, 10));
    const stop = trackPopovers(root, () => anchor);
    toggle(panel, 'open');
    expect(prop(panel, '--mp-popover-top')).toBe('');
    toggle(inner, 'open');
    window.dispatchEvent(new Event('scroll'));
    stop();
    expect(prop(inner, '--mp-popover-top')).toBe('132px');
  });
});
