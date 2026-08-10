import { beforeEach, describe, expect, it, vi } from 'vitest';
import './mp-hierarchy-chart';
import type { MpHierarchyChart } from './mp-hierarchy-chart';
import type { HierarchyNode } from '@mintplayer/web-components/charts/core';

/**
 * The tree/treeitem contract of `<mp-hierarchy-chart>` across all three
 * layouts. The tree role lives on the in-shadow container (svg for sunburst,
 * div for icicle/treemap) — never the host — and every treeitem carries the
 * full aria-level/posinset/setsize triple because the rendered window never
 * holds the whole tree (depth cap). Zoom-out controls are real <button>s
 * OUTSIDE the role=tree container (a tree may only own treeitems/groups).
 * All attributes are real DOM attributes, so jsdom can assert everything;
 * S1 measured that SVGElement.focus() works here too.
 */
const DATA: HierarchyNode = {
  id: 'repo', name: 'repo',
  children: [
    {
      id: 'src', name: 'src',
      children: [
        { id: 'a', name: 'alpha.ts', value: 600, colorValue: 80 },
        { id: 'b', name: 'beta.ts', value: 300, colorValue: 40 },
        { id: 'c', name: 'core.ts', value: 100, colorValue: 0 },
      ],
    },
    { id: 'libs', name: 'libs', children: [{ id: 'd', name: 'dock.ts', value: 500, colorValue: 100 }] },
    { id: 'tools', name: 'tools', value: 500, colorValue: 50 },
  ],
};

type Layout = 'sunburst' | 'icicle' | 'treemap';

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

function items(el: MpHierarchyChart): Element[] {
  return Array.from(el.shadowRoot!.querySelectorAll('[role="treeitem"]'));
}

function item(el: MpHierarchyChart, id: string): Element {
  return el.shadowRoot!.querySelector(`[role="treeitem"][data-id="${id}"]`) as Element;
}

function press(target: Element, key: string): void {
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, composed: true, cancelable: true }));
}

describe('mp-hierarchy-chart ARIA structure (all layouts)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  (['sunburst', 'icicle', 'treemap'] as Layout[]).map((layout) =>
    it(`${layout}: role=tree on the container, named via input-label, host stays generic`, async () => {
      const el = await mount(`layout="${layout}" input-label="Coverage"`);
      const tree = el.shadowRoot!.querySelector('[role="tree"]')!;
      expect(tree.getAttribute('aria-label')).toBe('Coverage');
      expect(el.hasAttribute('role')).toBe(false);
      // Host aria-label wins over input-label.
      el.setAttribute('aria-label', 'Chart');
      await flush(el);
      expect(el.shadowRoot!.querySelector('[role="tree"]')!.getAttribute('aria-label')).toBe('Chart');
      // Every treeitem inside the tree, nothing else inside it but treeitems.
      const owned = Array.from(tree.querySelectorAll('*')).filter((n) => n.hasAttribute('role'));
      owned.map((n) => expect(n.getAttribute('role')).toBe('treeitem'));
    }));

  (['sunburst', 'icicle', 'treemap'] as Layout[]).map((layout) =>
    it(`${layout}: treeitems carry level/posinset/setsize and localized names`, async () => {
      const el = await mount(`layout="${layout}" value-unit-label="lines" locale="en-US"`);
      const src = item(el, 'src');
      expect(src.getAttribute('aria-level')).toBe('2');
      expect(src.getAttribute('aria-setsize')).toBe('3');
      expect(src.getAttribute('aria-posinset')).toBe('1'); // 1000 lines = biggest
      expect(src.getAttribute('aria-expanded')).toBe('true');
      // Weighted rollup metric: (600*80 + 300*40 + 100*0) / 1000 = 60.
      expect(src.getAttribute('aria-label')).toBe('src, 60%, 1,000 lines');
      const leaf = item(el, 'a');
      expect(leaf.getAttribute('aria-level')).toBe('3');
      expect(leaf.hasAttribute('aria-expanded')).toBe(false);
      expect(leaf.getAttribute('aria-label')).toBe('alpha.ts, 80%, 600 lines');
    }));

  it('aria-expanded moves in both directions with the rendered window', async () => {
    const el = await mount('layout="sunburst" max-depth="1"');
    // With one ring, src's children are NOT rendered -> collapsed.
    expect(item(el, 'src').getAttribute('aria-expanded')).toBe('false');
    el.maxDepth = 2;
    await flush(el);
    expect(item(el, 'src').getAttribute('aria-expanded')).toBe('true');
    el.maxDepth = 1;
    await flush(el);
    expect(item(el, 'src').getAttribute('aria-expanded')).toBe('false');
  });
});

describe('mp-hierarchy-chart roving tabindex + keymap', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('exactly one treeitem is the tab stop; arrows move it between siblings with wrap', async () => {
    const el = await mount('layout="sunburst"');
    expect(items(el).filter((n) => n.getAttribute('tabindex') === '0')).toHaveLength(1);
    expect(item(el, 'src').getAttribute('tabindex')).toBe('0');

    press(item(el, 'src'), 'ArrowRight');
    await flush(el);
    // Value-desc, stable on ties: src(1000), libs(500), tools(500).
    expect(item(el, 'libs').getAttribute('tabindex')).toBe('0');
    const focusedAfterRight = items(el).find((n) => n.getAttribute('tabindex') === '0')!;
    press(focusedAfterRight, 'ArrowLeft');
    await flush(el);
    expect(item(el, 'src').getAttribute('tabindex')).toBe('0');
    // Wrap: Left from the first sibling lands on the last.
    press(item(el, 'src'), 'ArrowLeft');
    await flush(el);
    const last = items(el).find((n) => n.getAttribute('tabindex') === '0')!;
    press(last, 'ArrowRight');
    await flush(el);
    expect(item(el, 'src').getAttribute('tabindex')).toBe('0');
  });

  it('Down enters the child ring, Up returns to the parent, Home/End jump within siblings', async () => {
    const el = await mount('layout="icicle"');
    press(item(el, 'src'), 'ArrowDown');
    await flush(el);
    expect(item(el, 'a').getAttribute('tabindex')).toBe('0');
    press(item(el, 'a'), 'End');
    await flush(el);
    expect(item(el, 'c').getAttribute('tabindex')).toBe('0');
    press(item(el, 'c'), 'Home');
    await flush(el);
    expect(item(el, 'a').getAttribute('tabindex')).toBe('0');
    press(item(el, 'a'), 'ArrowUp');
    await flush(el);
    expect(item(el, 'src').getAttribute('tabindex')).toBe('0');
  });

  it('Enter re-roots on a folder and selects a leaf; Escape zooms out', async () => {
    const el = await mount('layout="sunburst"');
    const zooms: string[] = [];
    const selects: string[] = [];
    el.addEventListener('hierarchy-zoom', (e) => zooms.push((e as CustomEvent).detail.node.id));
    el.addEventListener('hierarchy-node-select', (e) => selects.push((e as CustomEvent).detail.node.id));

    press(item(el, 'src'), 'Enter');
    await flush(el);
    expect(zooms).toEqual(['src']);
    expect(el.getAttribute('root-id')).toBe('src');
    // Focus fell into the new first ring (old focus target left the window).
    expect(items(el).filter((n) => n.getAttribute('tabindex') === '0')).toHaveLength(1);

    press(item(el, 'a'), 'Enter');
    expect(selects).toEqual(['a']);
    expect(el.getAttribute('root-id')).toBe('src'); // leaf select does not re-root

    press(item(el, 'a'), 'Escape');
    await flush(el);
    expect(zooms).toEqual(['src', 'repo']);
    expect(el.hasAttribute('root-id')).toBe(false);
  });

  it('type-ahead jumps to the next rendered node by name prefix', async () => {
    const el = await mount('layout="treemap"');
    press(item(el, 'src'), 't');
    await flush(el);
    expect(item(el, 'tools').getAttribute('tabindex')).toBe('0');
  });

  it('focus (roving stop) survives a re-root and a layout switch by node id', async () => {
    const el = await mount('layout="sunburst"');
    press(item(el, 'src'), 'ArrowDown'); // -> 'a'
    await flush(el);
    expect(item(el, 'a').getAttribute('tabindex')).toBe('0');
    el.layout = 'icicle';
    await flush(el);
    expect(item(el, 'a').getAttribute('tabindex')).toBe('0');
    expect(item(el, 'a').tagName).toBe('DIV');
    el.layout = 'sunburst';
    await flush(el);
    expect(item(el, 'a').getAttribute('tabindex')).toBe('0');
    expect(item(el, 'a').tagName.toLowerCase()).toBe('path');
  });

  it('focusNode() moves the roving stop programmatically', async () => {
    const el = await mount('layout="sunburst"');
    el.focusNode('libs');
    await flush(el);
    expect(item(el, 'libs').getAttribute('tabindex')).toBe('0');
  });
});

describe('mp-hierarchy-chart zoom controls + announcements', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.useRealTimers();
  });

  it('sunburst center button: named, disabled at root, zooms out one level', async () => {
    const el = await mount('layout="sunburst" zoom-out-label="Naar boven"');
    const button = el.shadowRoot!.querySelector<HTMLButtonElement>('.center-control')!;
    expect(button.getAttribute('aria-label')).toBe('Naar boven');
    expect(button.disabled).toBe(true);
    // The button lives OUTSIDE the role=tree container.
    expect(button.closest('[role="tree"]')).toBeNull();

    el.zoomTo('src');
    await flush(el);
    const after = el.shadowRoot!.querySelector<HTMLButtonElement>('.center-control')!;
    expect(after.disabled).toBe(false);
    after.click();
    await flush(el);
    expect(el.hasAttribute('root-id')).toBe(false);
  });

  it('treemap header button carries the breadcrumb and zooms out', async () => {
    const el = await mount('layout="treemap"');
    el.zoomTo('src');
    await flush(el);
    const header = el.shadowRoot!.querySelector<HTMLButtonElement>('.treemap-header')!;
    expect(header.textContent).toContain('repo / src');
    expect(header.disabled).toBe(false);
    header.click();
    await flush(el);
    expect(el.shadowRoot!.querySelector<HTMLButtonElement>('.treemap-header')!.disabled).toBe(true);
  });

  it('zoom announces the new focus via the live region (one message, one channel)', async () => {
    const el = await mount('layout="sunburst"');
    el.zoomTo('src');
    await flush(el);
    const region = el.shadowRoot!.querySelector('[aria-live]')!;
    expect(region.textContent).toContain('src');
    // The tooltip never enters the accessibility tree.
    expect(el.shadowRoot!.querySelector('.chart-tooltip')!.getAttribute('aria-hidden')).toBe('true');
  });
});
