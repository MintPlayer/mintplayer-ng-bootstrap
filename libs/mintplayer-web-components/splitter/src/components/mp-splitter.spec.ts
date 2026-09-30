import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MpSplitter, type SplitterResizeEventDetail } from './mp-splitter';

// Force registration before tests construct elements.
void MpSplitter;

// jsdom lays nothing out: every rect is 0x0. These specs deliberately do NOT
// fake geometry (mp-splitter.aria.spec.ts does, for the percent maths). They
// pin the element's state machine, events, attributes and lifecycle; the
// proportional rescale maths is pinned by managers/rescale-panel-sizes.spec.ts
// and the drag clamp by managers/resize-manager.spec.ts.

async function flush(el: MpSplitter): Promise<void> {
  await el.updateComplete;
  // Two frames absorb the requestAnimationFrame chain in updatePanelsFromSlot.
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  await el.updateComplete;
}

function makeSplitter(panelCount = 2, attrs: Record<string, string> = {}): MpSplitter {
  const el = document.createElement('mp-splitter') as MpSplitter;
  Object.entries(attrs).map(([k, v]) => el.setAttribute(k, v));
  Array.from({ length: panelCount }, (_, i) => {
    const panel = document.createElement('div');
    panel.textContent = `Panel ${i + 1}`;
    return panel;
  }).map((p) => el.appendChild(p));
  return el;
}

async function mountSplitter(panelCount = 2, attrs: Record<string, string> = {}): Promise<MpSplitter> {
  const el = makeSplitter(panelCount, attrs);
  document.body.appendChild(el);
  await flush(el);
  return el;
}

const dividers = (el: MpSplitter) => Array.from(el.shadowRoot!.querySelectorAll<HTMLElement>('.divider'));
const wrappers = (el: MpSplitter) => Array.from(el.shadowRoot!.querySelectorAll<HTMLElement>('.panel-wrapper'));
const container = (el: MpSplitter) => el.shadowRoot!.querySelector<HTMLElement>('.splitter-container')!;

const mouse = (type: string, clientX = 0, clientY = 0) =>
  new MouseEvent(type, { bubbles: true, cancelable: true, clientX, clientY });

function touch(type: string, clientX = 0, clientY = 0): TouchEvent {
  const point = { clientX, clientY } as Touch;
  const event = new Event(type, { bubbles: true, cancelable: true }) as TouchEvent;
  Object.defineProperty(event, 'touches', { value: type === 'touchend' ? [] : [point] });
  Object.defineProperty(event, 'changedTouches', { value: [point] });
  return event;
}

function recordResizeEvents(el: MpSplitter): { type: string; detail: SplitterResizeEventDetail }[] {
  const log: { type: string; detail: SplitterResizeEventDetail }[] = [];
  ['resize-start', 'resizing', 'resize-end'].map((type) =>
    el.addEventListener(type, (e) =>
      log.push({ type, detail: (e as CustomEvent<SplitterResizeEventDetail>).detail }),
    ),
  );
  return log;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('mp-splitter — attributes and properties', () => {
  it('orientation defaults to horizontal', async () => {
    const el = await mountSplitter();
    expect(el.orientation).toBe('horizontal');
    expect(container(el).classList.contains('horizontal')).toBe(true);
  });

  it('the orientation setter reflects to the attribute and restyles the container', async () => {
    const el = await mountSplitter();
    el.orientation = 'vertical';
    expect(el.getAttribute('orientation')).toBe('vertical');
    expect(container(el).className).toBe('splitter-container vertical');
    expect(dividers(el)[0].getAttribute('aria-orientation')).toBe('horizontal');
  });

  it('removing the orientation attribute falls back to horizontal', async () => {
    const el = await mountSplitter(2, { orientation: 'vertical' });
    el.removeAttribute('orientation');
    expect(el.orientation).toBe('horizontal');
    expect(container(el).className).toBe('splitter-container horizontal');
  });

  it('an orientation set before first render still styles the container', async () => {
    const el = await mountSplitter(2, { orientation: 'vertical' });
    expect(container(el).classList.contains('vertical')).toBe(true);
    expect(dividers(el)[0].getAttribute('aria-orientation')).toBe('horizontal');
  });

  it('minPanelSize defaults to 50', async () => {
    const el = await mountSplitter();
    expect(el.minPanelSize).toBe(50);
  });

  it('the minPanelSize setter reflects to the min-panel-size attribute', async () => {
    const el = await mountSplitter();
    el.minPanelSize = 120;
    expect(el.getAttribute('min-panel-size')).toBe('120');
    expect(el.minPanelSize).toBe(120);
  });

  it('a non-numeric min-panel-size reads back as the 50 px the resize maths actually uses, not NaN', async () => {
    const el = await mountSplitter(2, { 'min-panel-size': 'wide' });
    expect(el.minPanelSize).toBe(50);
    // And the drag clamp agrees with the getter: from jsdom's 0-size panels a
    // drag clamps both panels up to the effective minimum.
    const log = recordResizeEvents(el);
    dividers(el)[0].dispatchEvent(mouse('mousedown', 100, 0));
    document.dispatchEvent(mouse('mousemove', 140, 0));
    document.dispatchEvent(mouse('mouseup', 140, 0));
    expect(log.find((e) => e.type === 'resizing')!.detail.sizes).toEqual([el.minPanelSize, el.minPanelSize]);
  });

  it('removing min-panel-size restores the default', async () => {
    const el = await mountSplitter(2, { 'min-panel-size': '80' });
    expect(el.minPanelSize).toBe(80);
    el.removeAttribute('min-panel-size');
    expect(el.minPanelSize).toBe(50);
  });

  it('min-panel-size drives the drag clamp', async () => {
    const el = await mountSplitter(2, { 'min-panel-size': '80' });
    const log = recordResizeEvents(el);
    dividers(el)[0].dispatchEvent(mouse('mousedown', 100, 0));
    document.dispatchEvent(mouse('mousemove', 140, 0));
    document.dispatchEvent(mouse('mouseup', 140, 0));
    expect(log.find((e) => e.type === 'resizing')!.detail.sizes).toEqual([80, 80]);
  });

  it('touchMode toggles the touch-mode attribute', async () => {
    const el = await mountSplitter();
    expect(el.touchMode).toBe(false);
    el.touchMode = true;
    expect(el.hasAttribute('touch-mode')).toBe(true);
    expect(el.touchMode).toBe(true);
    el.touchMode = false;
    expect(el.hasAttribute('touch-mode')).toBe(false);
    expect(el.touchMode).toBe(false);
  });
});

describe('mp-splitter — panel structure', () => {
  it('wraps each child in a named-slot wrapper with a divider between each pair', async () => {
    const el = await mountSplitter(3);
    expect(wrappers(el).map((w) => w.querySelector('slot')!.name)).toEqual(['panel-0', 'panel-1', 'panel-2']);
    expect(Array.from(el.children).map((c) => (c as HTMLElement).slot)).toEqual(['panel-0', 'panel-1', 'panel-2']);
    expect(dividers(el)).toHaveLength(2);
  });

  it('rebuilds when a panel is added', async () => {
    const el = await mountSplitter(2);
    el.appendChild(document.createElement('div'));
    await flush(el);
    expect(wrappers(el)).toHaveLength(3);
    expect(dividers(el)).toHaveLength(2);
  });

  it('keeps the last structure when every child is removed', async () => {
    const el = await mountSplitter(2);
    Array.from(el.children).map((c) => c.remove());
    await flush(el);
    expect(wrappers(el)).toHaveLength(2);
  });

  it('does not collapse panels to 0 px when layout has not run yet', async () => {
    const el = await mountSplitter(2);
    expect(el.getPanelSizes()).toEqual([]);
    expect(wrappers(el).map((w) => w.style.width)).toEqual(['', '']);
    expect(wrappers(el).every((w) => w.classList.contains('flex-grow'))).toBe(true);
  });

  it('applies sizes set before the panels were built', async () => {
    const el = makeSplitter(2);
    document.body.appendChild(el);
    await el.updateComplete;
    el.setPanelSizes([100, 300]);
    await flush(el);
    expect(wrappers(el).map((w) => w.style.width)).toEqual(['100px', '300px']);
    expect(el.getPanelSizes()).toEqual([100, 300]);
  });

  it('keeps applied sizes across a rebuild with the same panel count', async () => {
    const el = await mountSplitter(2);
    el.setPanelSizes([150, 250]);
    const replacement = document.createElement('div');
    el.replaceChild(replacement, el.children[1]);
    await flush(el);
    expect(wrappers(el).map((w) => w.style.width)).toEqual(['150px', '250px']);
  });

  it('a vertical splitter sizes panels by height and clears any width', async () => {
    const el = await mountSplitter(2, { orientation: 'vertical' });
    el.setPanelSizes([120, 180]);
    expect(wrappers(el).map((w) => w.style.height)).toEqual(['120px', '180px']);
    expect(wrappers(el).map((w) => w.style.width)).toEqual(['', '']);
  });

  it('setPanelSizes leaves a panel without a size untouched', async () => {
    const el = await mountSplitter(3);
    el.setPanelSizes([100, 200]);
    expect(wrappers(el).map((w) => w.style.width)).toEqual(['100px', '200px', '']);
    expect(wrappers(el)[2].classList.contains('flex-grow')).toBe(true);
  });
});

describe('mp-splitter — pointer resize lifecycle', () => {
  it('mouse drag emits resize-start, resizing and resize-end in order, carrying sizes and orientation', async () => {
    const el = await mountSplitter(2);
    const log = recordResizeEvents(el);
    dividers(el)[0].dispatchEvent(mouse('mousedown', 100, 0));
    document.dispatchEvent(mouse('mousemove', 160, 0));
    document.dispatchEvent(mouse('mouseup', 160, 0));
    expect(log.map((e) => e.type)).toEqual(['resize-start', 'resizing', 'resize-end']);
    expect(log[0].detail).toEqual({ sizes: [0, 0], orientation: 'horizontal' });
    expect(log[2].detail.sizes).toEqual(log[1].detail.sizes);
    expect(log.every((e) => e.detail.orientation === 'horizontal')).toBe(true);
  });

  it('marks the host resizing and the divider active only while the drag is in flight', async () => {
    const el = await mountSplitter(2);
    const divider = dividers(el)[0];
    divider.dispatchEvent(mouse('mousedown', 100, 0));
    expect(el.hasAttribute('resizing')).toBe(true);
    expect(divider.classList.contains('active')).toBe(true);
    document.dispatchEvent(mouse('mouseup', 100, 0));
    expect(el.hasAttribute('resizing')).toBe(false);
    expect(divider.classList.contains('active')).toBe(false);
  });

  it('the preview is written to the panels during the drag and persisted on release', async () => {
    const el = await mountSplitter(2);
    dividers(el)[0].dispatchEvent(mouse('mousedown', 100, 0));
    document.dispatchEvent(mouse('mousemove', 160, 0));
    expect(wrappers(el).map((w) => w.style.width)).toEqual(['50px', '50px']);
    expect(el.getPanelSizes()).toEqual([]);
    document.dispatchEvent(mouse('mouseup', 160, 0));
    expect(el.getPanelSizes()).toEqual([50, 50]);
  });

  it('a release without movement ends with the starting sizes', async () => {
    const el = await mountSplitter(2);
    const log = recordResizeEvents(el);
    dividers(el)[0].dispatchEvent(mouse('mousedown', 100, 0));
    document.dispatchEvent(mouse('mouseup', 100, 0));
    expect(log.map((e) => e.type)).toEqual(['resize-start', 'resize-end']);
    expect(log[1].detail.sizes).toEqual([0, 0]);
  });

  it('stops listening to the document once released', async () => {
    const el = await mountSplitter(2);
    const log = recordResizeEvents(el);
    dividers(el)[0].dispatchEvent(mouse('mousedown', 100, 0));
    document.dispatchEvent(mouse('mouseup', 100, 0));
    document.dispatchEvent(mouse('mousemove', 200, 0));
    document.dispatchEvent(mouse('mouseup', 200, 0));
    expect(log.map((e) => e.type)).toEqual(['resize-start', 'resize-end']);
  });

  it('events bubble so a parent (the dock) can listen for them', async () => {
    const el = await mountSplitter(2);
    const seen: string[] = [];
    document.body.addEventListener('resize-start', () => seen.push('start'));
    document.body.addEventListener('resize-end', () => seen.push('end'));
    dividers(el)[0].dispatchEvent(mouse('mousedown', 100, 0));
    document.dispatchEvent(mouse('mouseup', 100, 0));
    expect(seen).toEqual(['start', 'end']);
  });

  it('a touch drag runs the same lifecycle', async () => {
    const el = await mountSplitter(2, { orientation: 'vertical' });
    const log = recordResizeEvents(el);
    const divider = dividers(el)[0];
    const start = touch('touchstart', 0, 100);
    divider.dispatchEvent(start);
    expect(start.defaultPrevented).toBe(true);
    document.dispatchEvent(touch('touchmove', 0, 160));
    document.dispatchEvent(touch('touchend', 0, 160));
    expect(log.map((e) => e.type)).toEqual(['resize-start', 'resizing', 'resize-end']);
    expect(log[0].detail.orientation).toBe('vertical');
    expect(el.hasAttribute('resizing')).toBe(false);
  });

  it('a touchcancel ends a touch drag', async () => {
    const el = await mountSplitter(2);
    const log = recordResizeEvents(el);
    dividers(el)[0].dispatchEvent(touch('touchstart', 100, 0));
    document.dispatchEvent(touch('touchcancel', 100, 0));
    expect(log.map((e) => e.type)).toEqual(['resize-start', 'resize-end']);
    expect(el.hasAttribute('resizing')).toBe(false);
  });

  it('the divider in the middle of three panels resizes the second pair', async () => {
    const el = await mountSplitter(3, { 'min-panel-size': '10' });
    el.setPanelSizes([1, 2, 3]);
    const log = recordResizeEvents(el);
    dividers(el)[1].dispatchEvent(mouse('mousedown', 100, 0));
    document.dispatchEvent(mouse('mousemove', 120, 0));
    document.dispatchEvent(mouse('mouseup', 120, 0));
    // The drag starts from the measured sizes (0 in jsdom); only the pair
    // around divider 1 (panels 2 and 3) is clamped, panel 1 is untouched.
    expect(log[1].detail.sizes).toEqual([0, 10, 10]);
  });
});

describe('mp-splitter — container resize', () => {
  const original = globalThis.ResizeObserver;
  let observers: { cb: ResizeObserverCallback; targets: Element[]; disconnected: boolean }[] = [];

  beforeEach(() => {
    observers = [];
    globalThis.ResizeObserver = class {
      private readonly rec: { cb: ResizeObserverCallback; targets: Element[]; disconnected: boolean };
      constructor(cb: ResizeObserverCallback) {
        this.rec = { cb, targets: [], disconnected: false };
        observers.push(this.rec);
      }
      observe(target: Element): void {
        this.rec.targets.push(target);
      }
      unobserve(): void {
        /* not used by the element */
      }
      disconnect(): void {
        this.rec.disconnected = true;
      }
    } as unknown as typeof ResizeObserver;
  });

  afterEach(() => {
    globalThis.ResizeObserver = original;
  });

  it('observes the inner container', async () => {
    const el = await mountSplitter(2);
    expect(observers.at(-1)!.targets).toEqual([container(el)]);
  });

  it('a resize tick on an unmeasurable (0 px) container leaves the stored sizes alone', async () => {
    const el = await mountSplitter(2);
    el.setPanelSizes([100, 300]);
    observers.at(-1)!.cb([], {} as ResizeObserver);
    expect(el.getPanelSizes()).toEqual([100, 300]);
    expect(wrappers(el).map((w) => w.style.width)).toEqual(['100px', '300px']);
  });

  it('a resize tick during a drag does not fight the drag preview', async () => {
    const el = await mountSplitter(2);
    el.setPanelSizes([100, 300]);
    dividers(el)[0].dispatchEvent(mouse('mousedown', 100, 0));
    document.dispatchEvent(mouse('mousemove', 160, 0));
    observers.at(-1)!.cb([], {} as ResizeObserver);
    expect(wrappers(el).map((w) => w.style.width)).toEqual(['50px', '50px']);
    document.dispatchEvent(mouse('mouseup', 160, 0));
  });

  it('disconnects its observers when removed', async () => {
    const el = await mountSplitter(2);
    el.remove();
    expect(observers.at(-1)!.disconnected).toBe(true);
  });
});

describe('mp-splitter — reconnection', () => {
  it('a splitter moved to a new parent still tracks its children', async () => {
    const el = await mountSplitter(2);
    const host = document.createElement('section');
    document.body.appendChild(host);
    host.appendChild(el);
    await flush(el);
    el.appendChild(document.createElement('div'));
    await flush(el);
    expect(wrappers(el)).toHaveLength(3);
  });

  it('a splitter moved to a new parent still reflects an in-flight drag on the host', async () => {
    const el = await mountSplitter(2);
    const host = document.createElement('section');
    document.body.appendChild(host);
    host.appendChild(el);
    await flush(el);
    dividers(el)[0].dispatchEvent(mouse('mousedown', 100, 0));
    expect(el.hasAttribute('resizing')).toBe(true);
    document.dispatchEvent(mouse('mouseup', 100, 0));
    expect(el.hasAttribute('resizing')).toBe(false);
  });

  it('children changed while detached are picked up on reconnect', async () => {
    const el = await mountSplitter(2);
    el.remove();
    el.appendChild(document.createElement('div'));
    document.body.appendChild(el);
    await flush(el);
    expect(wrappers(el)).toHaveLength(3);
  });

  it('removal mid-drag ends the drag: one resize-end, and no further document events are handled', async () => {
    const el = await mountSplitter(2);
    const log = recordResizeEvents(el);
    dividers(el)[0].dispatchEvent(mouse('mousedown', 100, 0));
    document.dispatchEvent(mouse('mousemove', 160, 0));
    el.remove();
    document.dispatchEvent(mouse('mousemove', 200, 0));
    document.dispatchEvent(mouse('mouseup', 200, 0));
    expect(log.map((e) => e.type)).toEqual(['resize-start', 'resizing', 'resize-end']);
    expect(log[2].detail.sizes).toEqual(log[1].detail.sizes);
  });

  it('a splitter removed mid-drag is not left stuck in the resizing state when re-added', async () => {
    const el = await mountSplitter(2);
    const divider = dividers(el)[0];
    divider.dispatchEvent(mouse('mousedown', 100, 0));
    el.remove();
    document.body.appendChild(el);
    await flush(el);
    expect(el.hasAttribute('resizing')).toBe(false);
    expect(dividers(el).some((d) => d.classList.contains('active'))).toBe(false);
  });
});

describe('mp-splitter — resizeDividerBy on an unmeasurable container', () => {
  it('is a no-op while the container has no size', async () => {
    const el = await mountSplitter(2);
    el.setPanelSizes([100, 300]);
    const onEnd = vi.fn();
    el.addEventListener('resize-end', onEnd);
    el.resizeDividerBy(0, 'ArrowRight');
    expect(onEnd).not.toHaveBeenCalled();
    expect(el.getPanelSizes()).toEqual([100, 300]);
  });
});
