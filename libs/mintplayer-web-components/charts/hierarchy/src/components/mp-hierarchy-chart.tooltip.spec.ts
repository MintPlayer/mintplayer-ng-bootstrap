import { beforeEach, describe, expect, it } from 'vitest';
import './mp-hierarchy-chart';
import type { MpHierarchyChart } from './mp-hierarchy-chart';
import type { HierarchyNode } from '@mintplayer/web-components/charts/core';

/**
 * WCAG 1.4.13 for the chart tooltip: shown on FOCUS as well as hover,
 * dismissable with Escape (which is consumed BEFORE zoom-out), persistent
 * (no timer), and always aria-hidden — the treeitem's own aria-label speaks
 * the identical content, so the tooltip is a sighted-user channel only.
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

const tooltip = (el: MpHierarchyChart): HTMLElement =>
  el.shadowRoot!.querySelector('.chart-tooltip') as HTMLElement;
const item = (el: MpHierarchyChart, id: string): SVGElement =>
  el.shadowRoot!.querySelector(`[role="treeitem"][data-id="${id}"]`) as SVGElement;

function press(target: Element, key: string): void {
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, composed: true, cancelable: true }));
}

describe('tooltip on keyboard focus', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('focusing a node shows the tooltip with its text; blur hides it', async () => {
    const el = await mount();
    item(el, 'a').focus();
    expect(tooltip(el).hasAttribute('data-visible')).toBe(true);
    expect(tooltip(el).textContent).toContain('alpha.ts');
    item(el, 'a').blur();
    expect(tooltip(el).hasAttribute('data-visible')).toBe(false);
  });

  it('stays aria-hidden even while visible (one message, one channel)', async () => {
    const el = await mount();
    item(el, 'a').focus();
    expect(tooltip(el).getAttribute('aria-hidden')).toBe('true');
    expect(item(el, 'a').getAttribute('aria-describedby')).toBeNull();
  });

  it('Escape dismisses the tooltip first and only then zooms out', async () => {
    const el = await mount('root-id="src"');
    const zooms: string[] = [];
    el.addEventListener('hierarchy-zoom', () => zooms.push('zoom'));
    item(el, 'a').focus();
    expect(tooltip(el).hasAttribute('data-visible')).toBe(true);

    press(item(el, 'a'), 'Escape');
    await flush(el);
    expect(tooltip(el).hasAttribute('data-visible')).toBe(false);
    expect(zooms).toEqual([]); // first Escape consumed by the tooltip
    expect(el.getAttribute('root-id')).toBe('src');

    press(item(el, 'a'), 'Escape');
    await flush(el);
    expect(zooms).toEqual(['zoom']); // second Escape zooms out
    expect(el.hasAttribute('root-id')).toBe(false);
  });

  it('after an Escape dismissal, focusing a DIFFERENT node re-shows the tooltip', async () => {
    const el = await mount('root-id="src"');
    item(el, 'a').focus();
    press(item(el, 'a'), 'Escape');
    expect(tooltip(el).hasAttribute('data-visible')).toBe(false);
    item(el, 'b').focus();
    expect(tooltip(el).hasAttribute('data-visible')).toBe(true);
    expect(tooltip(el).textContent).toContain('beta.ts');
  });

  it('the focus root itself never gets a tooltip (its label is the center control)', async () => {
    const el = await mount('layout="icicle" root-id="src"');
    (el.shadowRoot!.querySelector('.focus-cell') as HTMLElement).focus();
    expect(tooltip(el).hasAttribute('data-visible')).toBe(false);
  });
});
