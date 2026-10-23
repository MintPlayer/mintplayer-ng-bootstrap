import { afterEach, describe, expect, it } from 'vitest';
import './mp-datatable';
import type { MpDatatable } from './mp-datatable';
import type { DatatableColumnDef } from '../types';

/**
 * #442: in fill mode the HOST is the scroll container (the stylesheet keys on
 * the `fill` attribute), so the attribute must be reflected when the mode is
 * set as a property, and virtual scroll must follow the host's scroll position
 * instead of `.datatable-scroll`'s. jsdom has no layout, so the sticky geometry
 * itself is checked in the browser, not here.
 */
interface Row { id: number; name: string; }

const ROWS: Row[] = Array.from({ length: 200 }, (_, i) => ({ id: i + 1, name: `r${i + 1}` }));
const columns: DatatableColumnDef[] = [{ name: 'name', label: 'Name' }];

const settle = async (el: MpDatatable): Promise<void> => {
  await el.updateComplete;
  await new Promise((r) => setTimeout(r));
  await el.updateComplete;
};

const cellTexts = (el: MpDatatable): string[] =>
  [...el.querySelectorAll('tbody td')].map((td) => td.textContent?.trim() ?? '');

function scrollTo(scroller: HTMLElement, top: number): void {
  Object.defineProperty(scroller, 'scrollTop', { configurable: true, get: () => top });
  scroller.dispatchEvent(new Event('scroll'));
}

describe('mp-datatable fill (#442)', () => {
  let el: MpDatatable | null = null;

  afterEach(() => {
    el?.remove();
    el = null;
  });

  async function mount(): Promise<MpDatatable> {
    const node = document.createElement('mp-datatable') as MpDatatable;
    node.columns = columns;
    node.data = ROWS;
    node.virtualScroll = true;
    node.itemSize = 40;
    document.body.appendChild(node);
    await settle(node);
    return node;
  }

  it('reflects the property as the attribute the stylesheet keys on, both ways', async () => {
    el = await mount();
    expect(el.hasAttribute('fill')).toBe(false);

    el.fill = true;
    await settle(el);
    expect(el.hasAttribute('fill')).toBe(true);

    el.removeAttribute('fill');
    await settle(el);
    expect(el.fill).toBe(false);
    expect(el.hasAttribute('fill')).toBe(false);
  });

  it('drives virtual scroll from the host in fill mode, and from .datatable-scroll otherwise', async () => {
    el = await mount();
    el.fill = true;
    await settle(el);

    scrollTo(el, 100 * 40);
    await settle(el);
    expect(cellTexts(el)).toContain('r100');
    expect(cellTexts(el)).not.toContain('r1');

    el.fill = false;
    await settle(el);
    const inner = el.querySelector<HTMLElement>('.datatable-scroll')!;
    scrollTo(inner, 0);
    await settle(el);
    expect(cellTexts(el)).toContain('r1');
  });
});
