import { beforeEach, describe, expect, it } from 'vitest';
import './mp-hierarchy-chart';
import type { MpHierarchyChart } from './mp-hierarchy-chart';
import type { HierarchyNode } from '@mintplayer/web-components/charts/core';

/**
 * Touch pinch = continuous GEOMETRIC magnification, like the wheel (PRD Z6 as
 * amended 2026-08-14): spread magnifies, squeeze shrinks, the midpoint pans.
 * Synthesized pointer-shaped events drive the plumbing here (jsdom accepts
 * any event type; pointerId/pointerType via defineProperty); real two-finger
 * streams are e2e territory. A pointercancel abandons the gesture so engines
 * that consume the second finger degrade to tap, never break.
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

async function mount(attrs = ''): Promise<MpHierarchyChart> {
  document.body.innerHTML = `<mp-hierarchy-chart transition-duration="0" ${attrs}></mp-hierarchy-chart>`;
  const el = document.querySelector('mp-hierarchy-chart') as MpHierarchyChart;
  el.data = DATA;
  await flush(el);
  return el;
}

const item = (el: MpHierarchyChart, id: string): Element =>
  el.shadowRoot!.querySelector(`[role="treeitem"][data-id="${id}"]`) as Element;

function pointerEvent(type: string, pointerId: number, x: number, y: number, pointerType = 'touch'): Event {
  const event = new MouseEvent(type, {
    bubbles: true, composed: true, cancelable: true, clientX: x, clientY: y,
  });
  Object.defineProperty(event, 'pointerId', { value: pointerId });
  Object.defineProperty(event, 'pointerType', { value: pointerType });
  return event;
}

describe('touch pinch magnification', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('a two-finger spread magnifies by the distance ratio', async () => {
    const el = await mount();
    const target = item(el, 'a');
    target.dispatchEvent(pointerEvent('pointerdown', 1, 100, 100));
    target.dispatchEvent(pointerEvent('pointerdown', 2, 140, 100));
    target.dispatchEvent(pointerEvent('pointermove', 2, 180, 100)); // 40 -> 80
    await flush(el);
    expect(el.zoomLevel).toBeCloseTo(2, 5);
    expect(el.hasAttribute('root-id')).toBe(false); // geometric, not semantic
  });

  it('a squeeze shrinks and clamps at 1x', async () => {
    const el = await mount();
    el.setZoomLevel(2);
    const target = item(el, 'a');
    target.dispatchEvent(pointerEvent('pointerdown', 1, 100, 100));
    target.dispatchEvent(pointerEvent('pointerdown', 2, 200, 100));
    target.dispatchEvent(pointerEvent('pointermove', 2, 120, 100)); // 100 -> 20
    await flush(el);
    expect(el.zoomLevel).toBe(1);
  });

  it('pointercancel abandons the gesture (divergent engines degrade to tap)', async () => {
    const el = await mount();
    const target = item(el, 'a');
    target.dispatchEvent(pointerEvent('pointerdown', 1, 100, 100));
    target.dispatchEvent(pointerEvent('pointerdown', 2, 140, 100));
    target.dispatchEvent(pointerEvent('pointercancel', 2, 140, 100));
    target.dispatchEvent(pointerEvent('pointermove', 1, 400, 100));
    await flush(el);
    expect(el.zoomLevel).toBe(1);
  });

  it('zoom-gestures="wheel" ignores touch pinch and drops the pinch touch-action class', async () => {
    const el = await mount('zoom-gestures="wheel"');
    const chart = el.shadowRoot!.querySelector('.chart')!;
    expect(chart.classList.contains('pinch')).toBe(false);
    const target = item(el, 'a');
    target.dispatchEvent(pointerEvent('pointerdown', 1, 100, 100));
    target.dispatchEvent(pointerEvent('pointerdown', 2, 140, 100));
    target.dispatchEvent(pointerEvent('pointermove', 2, 300, 100));
    await flush(el);
    expect(el.zoomLevel).toBe(1);
  });

  it('tap-to-re-root still works: a click after touch pointerdown is not suppressed', async () => {
    const el = await mount();
    const target = item(el, 'src');
    const down = pointerEvent('pointerdown', 1, 100, 100);
    target.dispatchEvent(down);
    expect(down.defaultPrevented).toBe(false); // the synthesized click survives
    target.dispatchEvent(pointerEvent('pointerup', 1, 100, 100));
    target.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    await flush(el);
    expect(el.getAttribute('root-id')).toBe('src');
  });
});

describe('mouse drag pan', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('a mouse drag while zoomed pans and its release is not a click activation', async () => {
    const el = await mount();
    el.setZoomLevel(4);
    await flush(el);
    const target = item(el, 'src');
    target.dispatchEvent(pointerEvent('pointerdown', 5, 100, 100, 'mouse'));
    target.dispatchEvent(pointerEvent('pointermove', 5, 60, 80, 'mouse'));
    target.dispatchEvent(pointerEvent('pointerup', 5, 60, 80, 'mouse'));
    target.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    await flush(el);
    expect(el.hasAttribute('root-id')).toBe(false); // the drag did not re-root
    expect(el.zoomLevel).toBeCloseTo(4, 5);
  });

  it('at 1x a mouse click is a plain activation (no drag machinery)', async () => {
    const el = await mount();
    const target = item(el, 'src');
    target.dispatchEvent(pointerEvent('pointerdown', 5, 100, 100, 'mouse'));
    target.dispatchEvent(pointerEvent('pointerup', 5, 100, 100, 'mouse'));
    target.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    await flush(el);
    expect(el.getAttribute('root-id')).toBe('src');
  });
});
