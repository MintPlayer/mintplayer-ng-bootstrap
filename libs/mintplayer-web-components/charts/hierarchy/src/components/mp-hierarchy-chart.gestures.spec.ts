import { beforeEach, describe, expect, it } from 'vitest';
import './mp-hierarchy-chart';
import type { MpHierarchyChart } from './mp-hierarchy-chart';
import type { HierarchyNode } from '@mintplayer/web-components/charts/core';

/**
 * Wheel gestures step the SEMANTIC re-root ladder (PRD Z1–Z5): ctrl/cmd+wheel
 * only (trackpad pinch arrives as ctrl+wheel), one step per ~100 normalized px
 * toward the node under the pointer; a plain wheel is never captured and only
 * shows the aria-hidden hint overlay.
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

function wheel(target: Element, init: WheelEventInit): WheelEvent {
  const event = new WheelEvent('wheel', { bubbles: true, composed: true, cancelable: true, ...init });
  target.dispatchEvent(event);
  return event;
}

describe('ctrl+wheel semantic ladder', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('ctrl+wheel-up over a leaf re-roots into ITS ancestor under the focus, and is consumed', async () => {
    const el = await mount();
    const zooms: string[] = [];
    el.addEventListener('hierarchy-zoom', (e) =>
      zooms.push((e as CustomEvent<{ node: HierarchyNode }>).detail.node.id));
    const event = wheel(item(el, 'a'), { deltaY: -100, ctrlKey: true });
    await flush(el);
    expect(event.defaultPrevented).toBe(true);
    expect(zooms).toEqual(['src']); // one level toward the pointer, not straight to the leaf
    expect(el.getAttribute('root-id')).toBe('src');
  });

  it('metaKey works like ctrlKey (⌘ on Apple platforms)', async () => {
    const el = await mount();
    wheel(item(el, 'a'), { deltaY: -100, metaKey: true });
    await flush(el);
    expect(el.getAttribute('root-id')).toBe('src');
  });

  it('ctrl+wheel-down zooms out one level', async () => {
    const el = await mount('root-id="src"');
    wheel(item(el, 'a'), { deltaY: 100, ctrlKey: true });
    await flush(el);
    expect(el.hasAttribute('root-id')).toBe(false);
  });

  it('small deltas accumulate to one step at ~100px', async () => {
    const el = await mount();
    wheel(item(el, 'a'), { deltaY: -50, ctrlKey: true });
    await flush(el);
    expect(el.hasAttribute('root-id')).toBe(false); // not yet
    wheel(item(el, 'a'), { deltaY: -50, ctrlKey: true });
    await flush(el);
    expect(el.getAttribute('root-id')).toBe('src');
  });

  it('deltaMode LINE is normalized (~16px per line)', async () => {
    const el = await mount();
    wheel(item(el, 'a'), { deltaY: -7, deltaMode: 1, ctrlKey: true }); // 112px equivalent
    await flush(el);
    expect(el.getAttribute('root-id')).toBe('src');
  });

  it('a plain wheel is NOT captured and only shows the aria-hidden hint', async () => {
    const el = await mount();
    const event = wheel(item(el, 'a'), { deltaY: -120 });
    await flush(el);
    expect(event.defaultPrevented).toBe(false); // page scroll survives
    expect(el.hasAttribute('root-id')).toBe(false);
    const hint = el.shadowRoot!.querySelector('.zoom-hint')!;
    expect(hint.getAttribute('aria-hidden')).toBe('true');
    expect(hint.textContent).toContain('scroll to zoom');
  });

  it('zoom-gestures="none" disables the wheel entirely — no capture, no hint', async () => {
    const el = await mount('zoom-gestures="none"');
    const event = wheel(item(el, 'a'), { deltaY: -200, ctrlKey: true });
    await flush(el);
    expect(event.defaultPrevented).toBe(false);
    expect(el.hasAttribute('root-id')).toBe(false);
    expect(el.shadowRoot!.querySelector('.zoom-hint')).toBeNull();
  });

  it('wheel-in over the current focus or whitespace is a no-op (but still consumed)', async () => {
    const el = await mount('root-id="src"');
    const svg = el.shadowRoot!.querySelector('svg')!;
    const event = wheel(svg, { deltaY: -150, ctrlKey: true });
    await flush(el);
    expect(event.defaultPrevented).toBe(true);
    expect(el.getAttribute('root-id')).toBe('src');
  });
});
