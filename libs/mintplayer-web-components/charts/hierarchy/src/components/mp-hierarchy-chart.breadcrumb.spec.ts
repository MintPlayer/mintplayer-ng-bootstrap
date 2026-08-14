import { beforeEach, describe, expect, it } from 'vitest';
import './mp-hierarchy-chart';
import type { MpHierarchyChart } from './mp-hierarchy-chart';
import type { HierarchyNode } from '@mintplayer/web-components/charts/core';

/** Breadcrumb (PRD B1): ancestor path as real buttons OUTSIDE the role=tree container. */
const DATA: HierarchyNode = {
  id: 'repo', name: 'repo',
  children: [
    {
      id: 'src', name: 'src',
      children: [
        {
          id: 'src/app', name: 'app',
          children: [{ id: 'a', name: 'alpha.ts', value: 600, colorValue: 80 }],
        },
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

describe('breadcrumb', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('absent by default; opt-in via show-breadcrumb', async () => {
    const plain = await mount();
    expect(plain.shadowRoot!.querySelector('nav.breadcrumb')).toBeNull();
    const el = await mount('show-breadcrumb');
    expect(el.shadowRoot!.querySelector('nav.breadcrumb')).not.toBeNull();
  });

  it('lives OUTSIDE the role=tree container and is named (localizable)', async () => {
    const el = await mount('show-breadcrumb breadcrumb-label="Pad in de grafiek"');
    const nav = el.shadowRoot!.querySelector('nav.breadcrumb')!;
    expect(nav.getAttribute('aria-label')).toBe('Pad in de grafiek');
    expect(nav.closest('[role="tree"]')).toBeNull();
  });

  it('ancestors are buttons, the focus is static text with aria-current', async () => {
    const el = await mount('show-breadcrumb root-id="src/app"');
    const nav = el.shadowRoot!.querySelector('nav.breadcrumb')!;
    const buttons = Array.from(nav.querySelectorAll('button.crumb'));
    expect(buttons.map((b) => b.textContent)).toEqual(['repo', 'src']);
    const current = nav.querySelector('.crumb-current')!;
    expect(current.textContent).toBe('app');
    expect(current.getAttribute('aria-current')).toBe('location');
    expect(nav.querySelector('button.crumb-current')).toBeNull();
  });

  it('clicking an ancestor re-roots there; the tree root clears root-id', async () => {
    const el = await mount('show-breadcrumb root-id="src/app"');
    const zooms: string[] = [];
    el.addEventListener('hierarchy-zoom', (e) =>
      zooms.push((e as CustomEvent<{ node: HierarchyNode }>).detail.node.id));
    const nav = el.shadowRoot!.querySelector('nav.breadcrumb')!;
    (Array.from(nav.querySelectorAll('button.crumb'))
      .find((b) => b.textContent === 'src') as HTMLElement).click();
    await flush(el);
    expect(el.getAttribute('root-id')).toBe('src');
    (el.shadowRoot!.querySelector('nav.breadcrumb button.crumb') as HTMLElement).click();
    await flush(el);
    expect(el.hasAttribute('root-id')).toBe(false);
    expect(zooms).toEqual(['src', 'repo']);
  });

  it('at the tree root there is nothing to click — a single current crumb', async () => {
    const el = await mount('show-breadcrumb');
    const nav = el.shadowRoot!.querySelector('nav.breadcrumb')!;
    expect(nav.querySelectorAll('button.crumb').length).toBe(0);
    expect(nav.querySelector('.crumb-current')!.textContent).toBe('repo');
  });
});
