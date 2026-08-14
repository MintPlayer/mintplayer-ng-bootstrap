import { beforeEach, describe, expect, it } from 'vitest';
import './mp-hierarchy-chart';
import type { MpHierarchyChart } from './mp-hierarchy-chart';
import type { HierarchyNode } from '@mintplayer/web-components/charts/core';

/**
 * Label decluttering + contrast (PRD hierarchy-chart-zoom-labels L1–L7).
 * Geometry under jsdom is deterministic: no ResizeObserver, so the element
 * uses its 420px-host fallback scale — the same geometry as the measured
 * speckling reproduction (coverage.mintplayer.com, 2026-08-14).
 */

async function flush(el: MpHierarchyChart): Promise<void> {
  await el.updateComplete;
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  await el.updateComplete;
}

async function mount(attrs: string, data: HierarchyNode): Promise<MpHierarchyChart> {
  document.body.innerHTML = `<mp-hierarchy-chart transition-duration="0" ${attrs}></mp-hierarchy-chart>`;
  const el = document.querySelector('mp-hierarchy-chart') as MpHierarchyChart;
  el.data = data;
  await flush(el);
  return el;
}

const arcLabels = (el: MpHierarchyChart): Element[] =>
  Array.from(el.shadowRoot!.querySelectorAll('text.arc-label'));
const cellLabels = (el: MpHierarchyChart): Element[] =>
  Array.from(el.shadowRoot!.querySelectorAll('.cell .cell-label'));

/** 30 sliver files under the root: each 12deg of sweep — arcs, never labels. */
const SLIVERS: HierarchyNode = {
  id: 'root', name: 'root',
  children: Array.from({ length: 30 }, (_, i) => ({
    id: `f${i}`, name: `file-${i}.ts`, value: 1, colorValue: (i * 7) % 100,
  })),
};

/**
 * Fixture with a forced outcome per node at the 420px fallback scale,
 * default depth 2, 12px font (totals: big 200 + components 680 + slivers 30):
 * - 'components' (680/910 of the circle) — labeled.
 * - beta's 41-char name in a 1.24rad arc — labeled but truncated (~27 chars).
 * - each 'child-N.ts' (25/910 -> ~0.17rad at ring 2) — suppressed packed,
 *   but re-rooting into 'big' gives each TAU/8 at ring 1 -> ~10 chars: labeled.
 * - slivers (3/910) — suppressed in every layout, arcs/cells still rendered.
 */
const MIXED: HierarchyNode = {
  id: 'root', name: 'root',
  children: [
    {
      id: 'big', name: 'big',
      children: Array.from({ length: 8 }, (_, i) => ({
        id: `k${i}`, name: `child-${i}.ts`, value: 25, colorValue: (i * 13) % 100,
      })),
    },
    {
      id: 'comp', name: 'components',
      children: [
        { id: 'a', name: 'alpha.ts', value: 500, colorValue: 90 },
        { id: 'b', name: 'beta-with-a-really-long-file-name.spec.ts', value: 180, colorValue: 60 },
      ],
    },
    ...Array.from({ length: 10 }, (_, i) => ({
      id: `s${i}`, name: `sliver-${i}.ts`, value: 3, colorValue: 50,
    })),
  ],
};

/** A single full-circle red leaf — the contrast flip case. */
const RED_LEAF: HierarchyNode = {
  id: 'root', name: 'root',
  children: [{ id: 'f', name: 'ffff', value: 100, colorValue: 0 }],
};

describe('sunburst label fitting', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('suppresses labels on slivers but never the arcs themselves', async () => {
    const el = await mount('', SLIVERS);
    expect(el.shadowRoot!.querySelectorAll('path.ring').length).toBe(30);
    expect(arcLabels(el).length).toBe(0);
  });

  it('labels the dominant folder, skips the slivers, truncates the too-long leaf', async () => {
    const el = await mount('', MIXED);
    const texts = arcLabels(el).map((t) => t.textContent ?? '');
    expect(texts).toContain('components');
    expect(texts.some((t) => t.startsWith('sliver'))).toBe(false);
    const truncated = texts.find((t) => t.startsWith('beta-'));
    expect(truncated).toBeDefined();
    expect(truncated!.endsWith('…')).toBe(true);
    expect(truncated!.length).toBeLessThan('beta-with-a-really-long-file-name.spec.ts'.length);
  });

  it('every rendered label is aria-hidden and carries a surface tone', async () => {
    const el = await mount('', MIXED);
    const labels = arcLabels(el);
    expect(labels.length).toBeGreaterThan(0);
    labels.map((t) => {
      expect(t.getAttribute('aria-hidden')).toBe('true');
      expect(['light', 'dark']).toContain(t.getAttribute('data-surface'));
    });
  });

  it('show-labels="false" removes every label', async () => {
    const el = await mount('show-labels="false"', MIXED);
    expect(arcLabels(el).length).toBe(0);
  });

  it('a font too large for the rings suppresses everything (constant-px contract)', async () => {
    const el = await mount('label-font-size="200"', MIXED);
    expect(arcLabels(el).length).toBe(0);
    expect(el.shadowRoot!.querySelectorAll('path.ring').length).toBeGreaterThan(0);
  });

  it('re-rooting reveals labels the packed view suppressed', async () => {
    const el = await mount('', MIXED);
    const packed = arcLabels(el).map((t) => t.textContent ?? '');
    expect(packed).not.toContain('child-0.ts');
    el.zoomTo('big');
    await flush(el);
    expect(arcLabels(el).map((t) => t.textContent ?? '')).toContain('child-0.ts');
  });
});

describe('label contrast (backdrop compositing)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('a translucent red leaf flips tone with the backdrop: dark text on white, light on dark', async () => {
    const el = await mount('', RED_LEAF);
    const label = arcLabels(el).find((t) => t.textContent === 'ffff');
    expect(label?.getAttribute('data-surface')).toBe('light'); // white default backdrop
    el.setAttribute('backdrop', '#212529');
    await flush(el);
    const flipped = arcLabels(el).find((t) => t.textContent === 'ffff');
    expect(flipped?.getAttribute('data-surface')).toBe('dark');
  });

  it('cells carry the tone too', async () => {
    const el = await mount('layout="icicle"', MIXED);
    const cells = Array.from(el.shadowRoot!.querySelectorAll('.cell'));
    expect(cells.length).toBeGreaterThan(0);
    cells.map((c) => expect(['light', 'dark']).toContain(c.getAttribute('data-surface')));
  });
});

describe('cartesian label fitting', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  (['icicle', 'treemap'] as const).map((layout) =>
    it(`${layout}: sliver cells render without a label span`, async () => {
      const el = await mount(`layout="${layout}"`, MIXED);
      const cells = el.shadowRoot!.querySelectorAll('.cell:not(.focus-cell)');
      expect(cells.length).toBeGreaterThan(0);
      expect(cellLabels(el).length).toBeLessThan(cells.length);
      expect(cellLabels(el).length).toBeGreaterThan(0);
    }));

  it('cell font-size is the constant device-px value, not a host-relative unit', async () => {
    const el = await mount('layout="icicle" label-font-size="14"', MIXED);
    const cell = el.shadowRoot!.querySelector<HTMLElement>('.cell')!;
    expect(cell.style.fontSize).toBe('14px');
  });
});
