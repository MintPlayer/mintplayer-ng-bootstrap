import { beforeEach, describe, expect, it } from 'vitest';
import './mp-hierarchy-chart';
import { pinchStepOf, type MpHierarchyChart } from './mp-hierarchy-chart';
import type { HierarchyNode } from '@mintplayer/web-components/charts/core';

/**
 * Pinch = the same semantic ladder as wheel (PRD Z6). The ratio math is pure
 * and tested exhaustively; the pointer plumbing is exercised with synthesized
 * pointer-shaped events (jsdom accepts any event type; pointerId/pointerType
 * are attached via defineProperty). Real two-finger streams are e2e territory.
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

function pointerEvent(
  type: string,
  pointerId: number,
  x: number,
  y: number,
): Event {
  const event = new MouseEvent(type, {
    bubbles: true, composed: true, cancelable: true, clientX: x, clientY: y,
  });
  Object.defineProperty(event, 'pointerId', { value: pointerId });
  Object.defineProperty(event, 'pointerType', { value: 'touch' });
  return event;
}

describe('pinchStepOf (pure hysteresis math)', () => {
  it('steps in at >= 1.3, out at <= 1/1.3, holds in between', () => {
    expect(pinchStepOf(1.3)).toBe('in');
    expect(pinchStepOf(2)).toBe('in');
    expect(pinchStepOf(1 / 1.3)).toBe('out');
    expect(pinchStepOf(0.5)).toBe('out');
    expect(pinchStepOf(1)).toBeUndefined();
    expect(pinchStepOf(1.29)).toBeUndefined();
    expect(pinchStepOf(0.78)).toBeUndefined();
  });
});

describe('pinch plumbing', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('a two-finger spread over a node re-roots toward it', async () => {
    const el = await mount();
    const target = item(el, 'a');
    target.dispatchEvent(pointerEvent('pointerdown', 1, 100, 100));
    target.dispatchEvent(pointerEvent('pointerdown', 2, 140, 100));
    target.dispatchEvent(pointerEvent('pointermove', 2, 160, 100)); // ratio 1.5
    await flush(el);
    expect(el.getAttribute('root-id')).toBe('src');
  });

  it('a two-finger squeeze zooms out', async () => {
    const el = await mount('root-id="src"');
    const target = item(el, 'a');
    target.dispatchEvent(pointerEvent('pointerdown', 1, 100, 100));
    target.dispatchEvent(pointerEvent('pointerdown', 2, 200, 100));
    target.dispatchEvent(pointerEvent('pointermove', 2, 170, 100)); // ratio 0.7
    await flush(el);
    expect(el.hasAttribute('root-id')).toBe(false);
  });

  it('pointercancel abandons the gesture (divergent engines degrade to tap)', async () => {
    const el = await mount();
    const target = item(el, 'a');
    target.dispatchEvent(pointerEvent('pointerdown', 1, 100, 100));
    target.dispatchEvent(pointerEvent('pointerdown', 2, 140, 100));
    target.dispatchEvent(pointerEvent('pointercancel', 2, 140, 100));
    target.dispatchEvent(pointerEvent('pointermove', 1, 400, 100));
    await flush(el);
    expect(el.hasAttribute('root-id')).toBe(false);
  });

  it('zoom-gestures="wheel" ignores touch pinch and keeps the un-suffixed touch-action', async () => {
    const el = await mount('zoom-gestures="wheel"');
    const chart = el.shadowRoot!.querySelector('.chart')!;
    expect(chart.classList.contains('pinch')).toBe(false);
    const target = item(el, 'a');
    target.dispatchEvent(pointerEvent('pointerdown', 1, 100, 100));
    target.dispatchEvent(pointerEvent('pointerdown', 2, 140, 100));
    target.dispatchEvent(pointerEvent('pointermove', 2, 300, 100));
    await flush(el);
    expect(el.hasAttribute('root-id')).toBe(false);
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
