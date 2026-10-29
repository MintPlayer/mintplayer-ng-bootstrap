import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import './generated';
import type { MpSplitter } from './generated';
import type { SplitterResizeEventDetail } from '@mintplayer/ui-core/splitter';

// jsdom lays nothing out. The splitter is given a known box (800 x 400 unless
// its inline style says otherwise), dividers take no space, and a pane
// measures its inline size, so 0 until the core has written one: these specs
// set sizes through setPanelSizes() the way the dock does.
const realRect = Element.prototype.getBoundingClientRect;
beforeEach(() => {
  Element.prototype.getBoundingClientRect = function (this: HTMLElement) {
    const box = (w: number, h: number) =>
      ({ x: 0, y: 0, top: 0, left: 0, right: w, bottom: h, width: w, height: h, toJSON: () => ({}) }) as DOMRect;
    if (this.classList.contains('splitter')) return box(parseFloat(this.style.width) || 800, parseFloat(this.style.height) || 400);
    return box(parseFloat(this.style.width) || 0, parseFloat(this.style.height) || 0);
  };
});
afterEach(() => {
  Element.prototype.getBoundingClientRect = realRect;
  document.body.innerHTML = '';
});

const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));

async function flush(el: MpSplitter): Promise<void> {
  await el.updateComplete;
  await Promise.all([...el.querySelectorAll('mp-splitter-panel')].map((panel) => (panel as unknown as { updateComplete: Promise<unknown> }).updateComplete));
  await frame();
  await frame();
  await el.updateComplete;
}

async function mount(count = 2, attrs: Record<string, string> = {}): Promise<MpSplitter> {
  const el = document.createElement('mp-splitter') as MpSplitter;
  Object.entries(attrs).forEach(([name, value]) => el.setAttribute(name, value));
  Array.from({ length: count }, (_, i) => {
    const panel = document.createElement('mp-splitter-panel');
    panel.textContent = `Panel ${i + 1}`;
    return panel;
  }).forEach((panel) => el.appendChild(panel));
  document.body.appendChild(el);
  await flush(el);
  return el;
}

async function sized(count = 2, attrs: Record<string, string> = {}): Promise<MpSplitter> {
  const el = await mount(count, attrs);
  const total = attrs['orientation'] === 'vertical' ? 400 : 800;
  el.setPanelSizes(Array.from({ length: count }, () => total / count));
  await flush(el);
  return el;
}

/** The visible dividers: every panel's but the first's. */
const dividers = (el: MpSplitter) =>
  [...el.querySelectorAll<HTMLElement>(':scope > .splitter-panel:not(:first-child) > .splitter-divider')];
const panes = (el: MpSplitter) => [...el.querySelectorAll<HTMLElement>(':scope > .splitter-panel > .splitter-pane')];
const key = (target: HTMLElement, name: string, shiftKey = false) => {
  const event = new KeyboardEvent('keydown', { key: name, shiftKey, bubbles: true, cancelable: true });
  target.dispatchEvent(event);
  return event;
};
const pointer = (type: string, clientX = 0, clientY = 0) =>
  new MouseEvent(type, { bubbles: true, cancelable: true, clientX, clientY, button: 0 });

function record(el: HTMLElement): { type: string; detail: SplitterResizeEventDetail }[] {
  const log: { type: string; detail: SplitterResizeEventDetail }[] = [];
  ['resizestart', 'resizing', 'resizeend'].forEach((type) =>
    el.addEventListener(type, (e) => log.push({ type, detail: (e as CustomEvent<SplitterResizeEventDetail>).detail })),
  );
  return log;
}

describe('mp-splitter structure', () => {
  it('renders each panel as a divider plus a pane, the first divider hidden by the sheet', async () => {
    const el = await mount(3);
    expect(el.classList.contains('splitter')).toBe(true);
    expect(el.classList.contains('horizontal')).toBe(true);
    expect(panes(el).map((pane) => pane.textContent?.trim())).toEqual(['Panel 1', 'Panel 2', 'Panel 3']);
    expect(dividers(el)).toHaveLength(2);
  });

  it('gives every pane a deterministic, unique id', async () => {
    const el = await mount(3);
    const ids = panes(el).map((pane) => pane.id);
    expect(new Set(ids).size).toBe(3);
    expect(ids.every((id) => id.endsWith('-pane'))).toBe(true);
  });

  it('picks up a panel added later', async () => {
    const el = await sized(2);
    el.appendChild(document.createElement('mp-splitter-panel'));
    await flush(el);
    expect(panes(el)).toHaveLength(3);
    expect(dividers(el)).toHaveLength(2);
    expect(dividers(el)[1].getAttribute('aria-label')).toBe('Resize between panel 2 and panel 3');
  });

  it('does not collapse panes to 0px before layout has run', async () => {
    const el = await mount(2);
    expect(panes(el).map((pane) => pane.style.width)).toEqual(['', '']);
    expect(el.getPanelSizes()).toEqual([]);
  });

  it('writes sizes along the axis only: a vertical splitter sizes by height', async () => {
    const el = await sized(2, { orientation: 'vertical' });
    expect(panes(el).map((pane) => pane.style.height)).toEqual(['200px', '200px']);
    expect(panes(el).map((pane) => pane.style.width)).toEqual(['', '']);
  });

  it('re-measures when the orientation flips', async () => {
    const el = await sized(2);
    el.setAttribute('orientation', 'vertical');
    await flush(el);
    expect(el.classList.contains('vertical')).toBe(true);
    expect(dividers(el)[0].getAttribute('aria-orientation')).toBe('horizontal');
    expect(panes(el).map((pane) => pane.style.width)).toEqual(['', '']);
  });
});

describe('mp-splitter ARIA', () => {
  it('each divider is a focusable separator across the axis', async () => {
    const el = await mount(2);
    const [divider] = dividers(el);
    expect(divider.getAttribute('role')).toBe('separator');
    expect(divider.getAttribute('tabindex')).toBe('0');
    expect(divider.getAttribute('aria-orientation')).toBe('vertical');
  });

  it('names its pair and points aria-controls at the two panes', async () => {
    const el = await mount(3);
    const ids = panes(el).map((pane) => pane.id);
    expect(dividers(el).map((divider) => divider.getAttribute('aria-controls'))).toEqual([
      `${ids[0]} ${ids[1]}`,
      `${ids[1]} ${ids[2]}`,
    ]);
    expect(dividers(el)[0].getAttribute('aria-label')).toBe('Resize between panel 1 and panel 2');
  });

  it('localizes the divider name through labels', async () => {
    const el = await mount(2);
    el.labels = { divider: 'Grootte ${before}/${after}' };
    await flush(el);
    expect(dividers(el)[0].getAttribute('aria-label')).toBe('Grootte 1/2');
  });

  it('reports the position as percent of the splitter', async () => {
    const el = await sized(2);
    const [divider] = dividers(el);
    expect(divider.getAttribute('aria-valuenow')).toBe('50');
    expect(divider.getAttribute('aria-valuemin')).toBe('6');
    expect(divider.getAttribute('aria-valuemax')).toBe('94');
    expect(divider.getAttribute('aria-valuetext')).toBe('50% / 50%');
  });
});

describe('mp-splitter keyboard', () => {
  it('ArrowRight grows the leading pane by 10% of the splitter; Shift makes it 1%', async () => {
    const el = await sized(2);
    const [divider] = dividers(el);
    expect(key(divider, 'ArrowRight').defaultPrevented).toBe(true);
    expect(el.getPanelSizes()).toEqual([480, 320]);
    key(divider, 'ArrowLeft', true);
    expect(el.getPanelSizes()).toEqual([472, 328]);
    expect(divider.getAttribute('aria-valuenow')).toBe('59');
  });

  it('off-axis arrows do nothing on a horizontal splitter', async () => {
    const el = await sized(2);
    key(dividers(el)[0], 'ArrowDown');
    expect(el.getPanelSizes()).toEqual([400, 400]);
  });

  it('a vertical splitter moves on ArrowDown', async () => {
    const el = await sized(2, { orientation: 'vertical' });
    key(dividers(el)[0], 'ArrowDown');
    expect(el.getPanelSizes()).toEqual([240, 160]);
  });

  it('Home and End push the divider to either limit', async () => {
    const el = await sized(2, { 'min-panel-size': '100' });
    const [divider] = dividers(el);
    key(divider, 'Home');
    expect(el.getPanelSizes()).toEqual([100, 700]);
    key(divider, 'End');
    expect(el.getPanelSizes()).toEqual([700, 100]);
  });

  it('clamps at the minimum size', async () => {
    const el = await sized(2, { 'min-panel-size': '350' });
    key(dividers(el)[0], 'ArrowRight');
    expect(el.getPanelSizes()).toEqual([450, 350]);
  });

  it('emits resizeend with the new sizes on every keystroke', async () => {
    const el = await sized(2);
    const log = record(el);
    key(dividers(el)[0], 'ArrowRight');
    expect(log).toEqual([{ type: 'resizeend', detail: { sizes: [480, 320], orientation: 'horizontal' } }]);
  });

  it('leaves unrelated keys alone', async () => {
    const el = await sized(2);
    expect(key(dividers(el)[0], 'a').defaultPrevented).toBe(false);
  });

  it('resizeDividerBy drives the same path; an unknown divider is a no-op', async () => {
    const el = await sized(3);
    const before = el.getPanelSizes();
    el.resizeDividerBy(1, 'ArrowRight');
    expect(el.getPanelSizes()[1]).toBeGreaterThan(before[1]);
    expect(el.getPanelSizes()[0]).toBe(before[0]);
    const now = el.getPanelSizes();
    el.resizeDividerBy(5, 'ArrowRight');
    expect(el.getPanelSizes()).toEqual(now);
  });
});

describe('mp-splitter pointer', () => {
  it('a drag emits resizestart, resizing and resizeend, previewing on the panes', async () => {
    const el = await sized(2);
    const log = record(el);
    const [divider] = dividers(el);
    divider.dispatchEvent(pointer('pointerdown', 400));
    expect(el.classList.contains('resizing')).toBe(false);
    await el.updateComplete;
    expect(el.classList.contains('resizing')).toBe(true);
    expect(divider.hasAttribute('data-active')).toBe(true);
    document.dispatchEvent(pointer('pointermove', 460));
    expect(panes(el).map((pane) => pane.style.width)).toEqual(['460px', '340px']);
    document.dispatchEvent(pointer('pointerup', 460));
    await el.updateComplete;
    expect(log.map((entry) => entry.type)).toEqual(['resizestart', 'resizing', 'resizeend']);
    expect(log[0].detail.sizes).toEqual([400, 400]);
    expect(log[2].detail).toEqual({ sizes: [460, 340], orientation: 'horizontal' });
    expect(el.getPanelSizes()).toEqual([460, 340]);
    expect(el.classList.contains('resizing')).toBe(false);
    expect(divider.hasAttribute('data-active')).toBe(false);
  });

  it('clamps a drag at the minimum size', async () => {
    const el = await sized(2, { 'min-panel-size': '100' });
    dividers(el)[0].dispatchEvent(pointer('pointerdown', 400));
    document.dispatchEvent(pointer('pointermove', 0));
    document.dispatchEvent(pointer('pointerup', 0));
    expect(el.getPanelSizes()).toEqual([100, 700]);
  });

  it('stops following the pointer once released', async () => {
    const el = await sized(2);
    const log = record(el);
    dividers(el)[0].dispatchEvent(pointer('pointerdown', 400));
    document.dispatchEvent(pointer('pointerup', 400));
    document.dispatchEvent(pointer('pointermove', 600));
    expect(log.map((entry) => entry.type)).toEqual(['resizestart', 'resizeend']);
    expect(el.getPanelSizes()).toEqual([400, 400]);
  });

  it('removal mid-drag commits it: one resizeend, nothing after', async () => {
    const el = await sized(2);
    const log = record(el);
    dividers(el)[0].dispatchEvent(pointer('pointerdown', 400));
    document.dispatchEvent(pointer('pointermove', 450));
    el.remove();
    document.dispatchEvent(pointer('pointermove', 600));
    document.dispatchEvent(pointer('pointerup', 600));
    expect(log.map((entry) => entry.type)).toEqual(['resizestart', 'resizing', 'resizeend']);
    expect(log[2].detail.sizes).toEqual([450, 350]);
  });
});

describe('mp-splitter nesting', () => {
  it('an inner splitter owns its own dividers and events', async () => {
    const outer = await sized(2);
    const inner = document.createElement('mp-splitter') as MpSplitter;
    inner.setAttribute('orientation', 'vertical');
    inner.append(document.createElement('mp-splitter-panel'), document.createElement('mp-splitter-panel'));
    outer.querySelectorAll('mp-splitter-panel')[1].appendChild(inner);
    await flush(outer);
    await flush(inner);
    inner.setPanelSizes([200, 200]);
    const outerLog = record(outer);
    const ownOuter: string[] = [];
    outer.addEventListener('resizeend', (e) => e.target === outer && ownOuter.push('outer'));
    expect(dividers(outer)).toHaveLength(1);
    key(dividers(inner)[0], 'ArrowDown');
    expect(inner.getPanelSizes()).toEqual([240, 160]);
    expect(outer.getPanelSizes()).toEqual([400, 400]);
    expect(ownOuter).toEqual([]);
    expect(outerLog.map((entry) => entry.type)).toEqual(['resizeend']);
  });
});
