import { beforeEach, describe, expect, it } from 'vitest';
import './mp-hierarchy-chart';
import type { MpHierarchyChart } from './mp-hierarchy-chart';
import type { HierarchyNode } from '@mintplayer/web-components/charts/core';

/**
 * Ctrl/⌘+wheel is GEOMETRIC magnification (user decision 2026-08-14): the
 * chart zooms like a map while labels hold their device-px size — magnifying
 * is what makes small segments' captions fit. Click/Enter stay semantic
 * re-root. A plain wheel is never captured (page scroll survives) and only
 * shows the aria-hidden hint overlay. Keyboard equivalents: + / - / 0.
 */
const DATA: HierarchyNode = {
  id: 'repo', name: 'repo',
  children: [
    {
      id: 'src', name: 'src',
      children: [
        { id: 'a', name: 'alpha.ts', value: 600, colorValue: 80 },
        { id: 'b', name: 'beta.ts', value: 400, colorValue: 40 },
      ],
    },
    { id: 'tools', name: 'tools', value: 500, colorValue: 50 },
  ],
};

async function flush(el: MpHierarchyChart): Promise<void> {
  await el.updateComplete;
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  await el.updateComplete;
}

async function mount(attrs = '', data: HierarchyNode = DATA): Promise<MpHierarchyChart> {
  document.body.innerHTML = `<mp-hierarchy-chart transition-duration="0" ${attrs}></mp-hierarchy-chart>`;
  const el = document.querySelector('mp-hierarchy-chart') as MpHierarchyChart;
  el.data = data;
  await flush(el);
  return el;
}

const item = (el: MpHierarchyChart, id: string): Element =>
  el.shadowRoot!.querySelector(`[role="treeitem"][data-id="${id}"]`) as Element;

function wheel(target: Element, init: WheelEventInit): WheelEvent {
  const event = new WheelEvent('wheel', { bubbles: true, composed: true, cancelable: true, ...init });
  target.dispatchEvent(event);
  return event;
}

function press(target: Element, key: string): void {
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, composed: true, cancelable: true }));
}

describe('ctrl+wheel geometric zoom', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('ctrl+wheel-up magnifies (no re-root!) and the event is consumed', async () => {
    const el = await mount();
    const event = wheel(item(el, 'a'), { deltaY: -100, ctrlKey: true });
    await flush(el);
    expect(event.defaultPrevented).toBe(true);
    expect(el.zoomLevel).toBeCloseTo(Math.exp(0.5), 3); // ~1.65x per full notch
    expect(el.hasAttribute('root-id')).toBe(false); // semantic state untouched
    // The sunburst zooms via its viewBox — never a transform.
    const viewBox = el.shadowRoot!.querySelector('svg')!.getAttribute('viewBox')!;
    expect(Number(viewBox.split(' ')[2])).toBeCloseTo(1000 / Math.exp(0.5), 0);
  });

  it('metaKey works like ctrlKey (⌘ on Apple platforms)', async () => {
    const el = await mount();
    wheel(item(el, 'a'), { deltaY: -100, metaKey: true });
    expect(el.zoomLevel).toBeGreaterThan(1);
  });

  it('ctrl+wheel-down shrinks back and clamps at 1x', async () => {
    const el = await mount();
    wheel(item(el, 'a'), { deltaY: -100, ctrlKey: true });
    const zoomed = el.zoomLevel;
    wheel(item(el, 'a'), { deltaY: 100, ctrlKey: true });
    expect(el.zoomLevel).toBeLessThan(zoomed);
    wheel(item(el, 'a'), { deltaY: 100, ctrlKey: true });
    wheel(item(el, 'a'), { deltaY: 100, ctrlKey: true });
    expect(el.zoomLevel).toBe(1);
  });

  it('deltaMode LINE is normalized and per-event delta is clamped', async () => {
    const el = await mount();
    wheel(item(el, 'a'), { deltaY: -7, deltaMode: 1, ctrlKey: true }); // 112px -> clamped to 100
    expect(el.zoomLevel).toBeCloseTo(Math.exp(0.5), 3);
  });

  it('zooming in reveals labels that did not fit at 1x, at the same font size', async () => {
    const slivers: HierarchyNode = {
      id: 'root', name: 'root',
      children: Array.from({ length: 30 }, (_, i) => ({
        id: `f${i}`, name: `file-${i}.ts`, value: 1, colorValue: 50,
      })),
    };
    const el = await mount('', slivers);
    expect(el.shadowRoot!.querySelectorAll('text.arc-label').length).toBe(0);
    el.setZoomLevel(8);
    await flush(el);
    const labels = el.shadowRoot!.querySelectorAll('text.arc-label');
    expect(labels.length).toBeGreaterThan(0);
    // Constant device px: viewBox font-size shrinks by exactly the zoom factor.
    const fontVb = Number(labels[0].getAttribute('font-size'));
    expect(fontVb).toBeCloseTo(12 / (0.42 * 8), 1);
  });

  it('a plain wheel is NOT captured and only shows the aria-hidden hint', async () => {
    const el = await mount();
    const event = wheel(item(el, 'a'), { deltaY: -120 });
    await flush(el);
    expect(event.defaultPrevented).toBe(false); // page scroll survives
    expect(el.zoomLevel).toBe(1);
    const hint = el.shadowRoot!.querySelector('.zoom-hint')!;
    expect(hint.getAttribute('aria-hidden')).toBe('true');
    expect(hint.textContent).toContain('scroll to zoom');
  });

  it('zoom-gestures="none" disables the wheel entirely — no capture, no hint', async () => {
    const el = await mount('zoom-gestures="none"');
    const event = wheel(item(el, 'a'), { deltaY: -200, ctrlKey: true });
    await flush(el);
    expect(event.defaultPrevented).toBe(false);
    expect(el.zoomLevel).toBe(1);
    expect(el.shadowRoot!.querySelector('.zoom-hint')).toBeNull();
  });
});

describe('keyboard zoom equivalents (+ / - / 0) and Escape ordering', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('+ and - zoom around the focused node; 0 resets', async () => {
    const el = await mount();
    press(item(el, 'a'), '+');
    expect(el.zoomLevel).toBeCloseTo(1.5, 5);
    press(item(el, 'a'), '+');
    expect(el.zoomLevel).toBeCloseTo(2.25, 5);
    press(item(el, 'a'), '-');
    expect(el.zoomLevel).toBeCloseTo(1.5, 5);
    press(item(el, 'a'), '0');
    expect(el.zoomLevel).toBe(1);
  });

  it('Escape resets the magnified view BEFORE it re-roots out', async () => {
    const el = await mount('root-id="src"');
    el.setZoomLevel(4);
    await flush(el);
    press(item(el, 'a'), 'Escape');
    await flush(el);
    expect(el.zoomLevel).toBe(1); // first Escape: view reset
    expect(el.getAttribute('root-id')).toBe('src');
    press(item(el, 'a'), 'Escape');
    await flush(el);
    expect(el.hasAttribute('root-id')).toBe(false); // second Escape: semantic out
  });

  it('a semantic re-root resets the magnification (the subtree refits anyway)', async () => {
    const el = await mount();
    el.setZoomLevel(4);
    el.zoomTo('src');
    await flush(el);
    expect(el.zoomLevel).toBe(1);
    expect(el.getAttribute('root-id')).toBe('src');
  });
});
