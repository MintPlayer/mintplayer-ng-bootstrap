import { afterEach, describe, expect, it, vi } from 'vitest';
import './mp-hierarchy-chart';
import type { MpHierarchyChart } from './mp-hierarchy-chart';
import type { HierarchyNode } from '@mintplayer/web-components/charts/core';

/**
 * Motion and lifecycle: the sunburst re-root tween (rAF-driven, frames
 * advanced with fake timers), reduced motion, the ResizeObserver lifecycle,
 * backdrop auto-detection, the wheel hint timer, and the pointer/keyboard
 * activation edges the other suites leave out. No rect or size value is
 * faked anywhere in this file.
 */
const DATA: HierarchyNode = {
  id: 'root', name: 'root',
  children: [
    {
      id: 'comp', name: 'components',
      children: [
        { id: 'a', name: 'alpha.ts', value: 500, colorValue: 90 },
        { id: 'b', name: 'beta.ts', value: 300, colorValue: 60 },
      ],
    },
    { id: 'tools', name: 'tools', value: 200, colorValue: 10 },
  ],
};

async function settle(el: MpHierarchyChart): Promise<void> {
  await el.updateComplete;
  await Promise.resolve();
  await el.updateComplete;
}

async function mount(attrs = '', wrapper = ''): Promise<MpHierarchyChart> {
  const tag = `<mp-hierarchy-chart ${attrs}></mp-hierarchy-chart>`;
  document.body.innerHTML = wrapper ? `<div ${wrapper}>${tag}</div>` : tag;
  const el = document.querySelector('mp-hierarchy-chart') as MpHierarchyChart;
  el.data = DATA;
  await settle(el);
  return el;
}

const arcLabels = (el: MpHierarchyChart) => Array.from(el.shadowRoot!.querySelectorAll('text.arc-label'));
const ring = (el: MpHierarchyChart, id: string) =>
  el.shadowRoot!.querySelector(`path.ring[data-id="${id}"]`)!.getAttribute('d');
const item = (el: MpHierarchyChart, id: string) =>
  el.shadowRoot!.querySelector(`[role="treeitem"][data-id="${id}"]`) as HTMLElement;

function stubReducedMotion(matches: boolean): void {
  vi.stubGlobal('matchMedia', (query: string) => ({ matches, media: query }) as MediaQueryList);
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

describe('sunburst re-root tween', () => {
  it('animates arcs between the two roots, hides labels mid-flight, and settles on the target geometry', async () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    // The settled reference: the same re-root with no animation.
    const reference = await mount('transition-duration="0"');
    reference.rootId = 'comp';
    await settle(reference);
    const settledAlpha = ring(reference, 'a');

    const el = await mount('transition-duration="100"');
    expect(el.style.getPropertyValue('--mp-hierarchy-chart-transition-duration')).toBe('100ms');
    const before = ring(el, 'a');
    el.rootId = 'comp';
    await settle(el);
    // First frame: still drawn where it was, labels suppressed while moving.
    expect(arcLabels(el)).toHaveLength(0);

    vi.advanceTimersByTime(50);
    await settle(el);
    const mid = ring(el, 'a');
    expect(mid).not.toBe(before);
    expect(mid).not.toBe(settledAlpha);
    expect(arcLabels(el)).toHaveLength(0);

    vi.advanceTimersByTime(100);
    await settle(el);
    expect(ring(el, 'a')).toBe(settledAlpha);
    expect(arcLabels(el).length).toBeGreaterThan(0);
  });

  it('a retarget mid-tween restarts from the drawn state and still lands on the new root', async () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    const el = await mount('transition-duration="100"');
    el.rootId = 'comp';
    await settle(el);
    vi.advanceTimersByTime(40);
    await settle(el);
    el.rootId = undefined;
    await settle(el);
    vi.advanceTimersByTime(200);
    await settle(el);
    expect(el.hasAttribute('root-id')).toBe(false);
    expect(item(el, 'tools')).not.toBeNull();
    expect(arcLabels(el).length).toBeGreaterThan(0);
  });

  it('prefers-reduced-motion re-roots in one frame, labels included', async () => {
    stubReducedMotion(true);
    const el = await mount('transition-duration="300"');
    el.rootId = 'comp';
    await settle(el);
    expect(arcLabels(el).length).toBeGreaterThan(0);
  });

  it('the div layouts never run the JS tween (they animate through the CSS custom property)', async () => {
    const el = await mount('layout="icicle" transition-duration="300"');
    el.rootId = 'comp';
    await settle(el);
    expect(item(el, 'a')).not.toBeNull();
    expect(el.shadowRoot!.querySelector('.focus-cell')!.getAttribute('data-id')).toBe('comp');
  });
});

describe('host size observation', () => {
  it('observes the host while connected and stops on disconnect', async () => {
    const observed: Element[] = [];
    const disconnect = vi.fn();
    vi.stubGlobal('ResizeObserver', class {
      constructor(private readonly cb: ResizeObserverCallback) {}
      observe(target: Element) { observed.push(target); }
      disconnect() { disconnect(); }
      unobserve() { /* unused */ }
    });
    const el = await mount('transition-duration="0"');
    expect(observed).toEqual([el]);
    el.remove();
    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it('an entry for a hidden (zero-width) host keeps the current label layout', async () => {
    let callback: ResizeObserverCallback | undefined;
    vi.stubGlobal('ResizeObserver', class {
      constructor(cb: ResizeObserverCallback) { callback = cb; }
      observe() { /* recorded by constructor */ }
      disconnect() { /* nothing to release */ }
      unobserve() { /* unused */ }
    });
    const el = await mount('transition-duration="0"');
    const labels = arcLabels(el).map((t) => t.textContent);
    // jsdom reports a hidden host exactly like this: an empty content box.
    callback!([{ contentRect: el.getBoundingClientRect() } as unknown as ResizeObserverEntry], {} as ResizeObserver);
    callback!([], {} as ResizeObserver);
    await settle(el);
    expect(arcLabels(el).map((t) => t.textContent)).toEqual(labels);
  });
});

describe('backdrop auto-detection', () => {
  it('reads the nearest opaque ancestor background, skipping translucent ones', async () => {
    const explicit = await mount('transition-duration="0" backdrop="rgb(0, 0, 0)"');
    const expected = arcLabels(explicit).map((t) => t.getAttribute('data-surface'));
    expect(expected).toContain('dark');

    document.body.innerHTML =
      '<div class="outer"><div class="inner"><mp-hierarchy-chart transition-duration="0"></mp-hierarchy-chart></div></div>';
    const outer = document.querySelector<HTMLElement>('.outer')!;
    const inner = document.querySelector<HTMLElement>('.inner')!;
    outer.style.backgroundColor = 'rgb(0, 0, 0)';
    inner.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
    const el = document.querySelector('mp-hierarchy-chart') as MpHierarchyChart;
    el.data = DATA;
    await settle(el);
    expect(arcLabels(el).map((t) => t.getAttribute('data-surface'))).toEqual(expected);
  });

  it('an explicit backdrop wins over the detected one, and clearing it re-detects', async () => {
    document.body.innerHTML = '<div class="bg"><mp-hierarchy-chart transition-duration="0" backdrop="#ffffff"></mp-hierarchy-chart></div>';
    document.querySelector<HTMLElement>('.bg')!.style.backgroundColor = 'rgb(0, 0, 0)';
    const el = document.querySelector('mp-hierarchy-chart') as MpHierarchyChart;
    el.data = DATA;
    await settle(el);
    const onWhite = arcLabels(el).map((t) => t.getAttribute('data-surface'));
    el.removeAttribute('backdrop');
    await settle(el);
    expect(el.backdrop).toBeUndefined();
    expect(arcLabels(el).map((t) => t.getAttribute('data-surface'))).not.toEqual(onWhite);
  });
});

describe('wheel hint', () => {
  it('a plain wheel shows the (localizable) hint, which hides itself after 1.5s', async () => {
    vi.useFakeTimers();
    const el = await mount('transition-duration="0" zoom-hint-label="Hold Ctrl to zoom"');
    expect(el.zoomHintLabel).toBe('Hold Ctrl to zoom');
    el.dispatchEvent(new WheelEvent('wheel', { deltaY: 10, bubbles: true, cancelable: true }));
    await settle(el);
    expect(el.shadowRoot!.querySelector('.zoom-hint')!.textContent).toBe('Hold Ctrl to zoom');
    vi.advanceTimersByTime(1500);
    await settle(el);
    expect(el.shadowRoot!.querySelector('.zoom-hint')).toBeNull();
  });

  it('the default hint names the platform modifier', async () => {
    const el = await mount('transition-duration="0"');
    expect(el.zoomHintLabel).toMatch(/^Use (Ctrl|⌘) \+ scroll to zoom the chart$/);
    el.zoomHintLabel = '';
    expect(el.zoomHintLabel).toMatch(/scroll to zoom/);
  });

  it('zoom-gestures reports "none" once every gesture is disabled', async () => {
    const el = await mount('transition-duration="0" zoom-gestures="none"');
    expect(el.zoomGestures).toBe('none');
    el.removeAttribute('zoom-gestures');
    expect(el.zoomGestures).toBe('wheel pinch');
  });
});

describe('activation edges', () => {
  it('clicking the focus cell zooms out one level', async () => {
    const el = await mount('transition-duration="0" layout="icicle" root-id="comp"');
    const zooms: Array<string | undefined> = [];
    el.addEventListener('hierarchy-zoom', (e) => zooms.push((e as CustomEvent).detail.node.id));
    el.shadowRoot!.querySelector<HTMLElement>('.focus-cell')!.click();
    await settle(el);
    expect(el.hasAttribute('root-id')).toBe(false);
    expect(zooms).toEqual(['root']);
  });

  it('clicking a leaf selects it with its path; clicking empty chart space does nothing', async () => {
    const el = await mount('transition-duration="0"');
    const selected: string[][] = [];
    el.addEventListener('hierarchy-node-select', (e) =>
      selected.push((e as CustomEvent).detail.path.map((n: HierarchyNode) => n.id)));
    item(el, 'tools').dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    el.shadowRoot!.querySelector('.chart')!.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    expect(selected).toEqual([['root', 'tools']]);
  });

  it('hovering a node then the focus root clears the hover exactly once', async () => {
    const el = await mount('transition-duration="0" layout="icicle"');
    const hovers: Array<string | null> = [];
    el.addEventListener('hierarchy-node-hover', (e) => hovers.push((e as CustomEvent).detail.node?.id ?? null));
    const move = (target: Element) => {
      const ev = new MouseEvent('pointermove', { bubbles: true, composed: true });
      Object.defineProperty(ev, 'pointerId', { value: 1 });
      Object.defineProperty(ev, 'pointerType', { value: 'mouse' });
      target.dispatchEvent(ev);
    };
    move(item(el, 'tools'));
    move(item(el, 'tools'));
    expect(el.shadowRoot!.querySelector('.chart-tooltip')!.hasAttribute('data-visible')).toBe(true);
    move(el.shadowRoot!.querySelector('.focus-cell')!);
    move(el.shadowRoot!.querySelector('.focus-cell')!);
    expect(hovers).toEqual(['tools', null]);
    expect(el.shadowRoot!.querySelector('.chart-tooltip')!.hasAttribute('data-visible')).toBe(false);
  });

  it('a single-finger touch move hovers like a mouse and never zooms', async () => {
    const el = await mount('transition-duration="0"');
    const hovers: Array<string | null> = [];
    el.addEventListener('hierarchy-node-hover', (e) => hovers.push((e as CustomEvent).detail.node?.id ?? null));
    const touch = (type: string, x: number) => {
      const ev = new MouseEvent(type, { bubbles: true, composed: true, clientX: x, clientY: 10 });
      Object.defineProperty(ev, 'pointerId', { value: 7 });
      Object.defineProperty(ev, 'pointerType', { value: 'touch' });
      item(el, 'tools').dispatchEvent(ev);
    };
    touch('pointerdown', 10);
    touch('pointermove', 90);
    expect(el.zoomLevel).toBe(1);
    expect(hovers).toEqual(['tools']);
  });

  it('Backspace zooms out when re-rooted and lets the key through at the tree root', async () => {
    const el = await mount('transition-duration="0" root-id="comp"');
    const press = (target: Element) => {
      const ev = new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, composed: true, cancelable: true });
      target.dispatchEvent(ev);
      return ev;
    };
    expect(press(item(el, 'a')).defaultPrevented).toBe(true);
    await settle(el);
    expect(el.hasAttribute('root-id')).toBe(false);
    expect(press(item(el, 'comp')).defaultPrevented).toBe(false);
  });
});
