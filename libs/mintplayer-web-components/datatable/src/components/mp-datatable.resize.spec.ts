import { afterEach, describe, expect, it, vi } from 'vitest';
import './mp-datatable';
import type { MpDatatable } from './mp-datatable';
import type { DatatableColumnDef } from '../types';
import { MIN_COLUMN_WIDTH, resizedColumnWidth } from './column-resize';

/**
 * Pointer column resize. The width arithmetic is the pure `resizedColumnWidth`
 * (tested with numbers); the element specs assert the drag LIFECYCLE and that
 * pointer deltas are applied relative to each other — never an absolute width
 * derived from jsdom's layout-free geometry.
 */
describe('resizedColumnWidth', () => {
  it('adds the delta to the start width', () => {
    expect(resizedColumnWidth(120, 30)).toBe(150);
    expect(resizedColumnWidth(120, -30)).toBe(90);
  });

  it('never goes below the shared floor', () => {
    expect(resizedColumnWidth(60, -100)).toBe(MIN_COLUMN_WIDTH);
    expect(resizedColumnWidth(MIN_COLUMN_WIDTH, 0)).toBe(MIN_COLUMN_WIDTH);
  });
});

const settle = async (el: MpDatatable): Promise<void> => {
  await el.updateComplete;
  await new Promise((r) => setTimeout(r));
  await el.updateComplete;
};

const root = (el: MpDatatable) => el.renderRoot as unknown as ParentNode;
const th = (el: MpDatatable) => root(el).querySelector<HTMLElement>('thead th[data-column="name"]')!;
const handle = (el: MpDatatable) => th(el).querySelector<HTMLElement>('.resize-handle');
const widthPx = (el: MpDatatable) => parseFloat(th(el).style.width);

function pointer(type: string, clientX: number): MouseEvent {
  const ev = new MouseEvent(type, { bubbles: true, cancelable: true, clientX });
  Object.defineProperty(ev, 'pointerId', { value: 7 });
  return ev;
}

async function mount(): Promise<{ el: MpDatatable; h: HTMLElement }> {
  const el = document.createElement('mp-datatable') as MpDatatable;
  el.columns = [{ name: 'name', label: 'Name' }] as DatatableColumnDef[];
  el.data = [{ id: 1, name: 'a' }];
  document.body.appendChild(el);
  await settle(el);
  const h = handle(el)!;
  // Capture is a platform side effect jsdom does not implement; stubbing it
  // invents no geometry.
  h.setPointerCapture = vi.fn();
  h.releasePointerCapture = vi.fn(() => { throw new Error('not captured'); });
  return { el, h };
}

describe('mp-datatable pointer column resize', () => {
  afterEach(() => { document.body.innerHTML = ''; });

  it('a drag marks the handle active, captures the pointer and follows the pointer delta', async () => {
    const { el, h } = await mount();
    const down = pointer('pointerdown', 100);
    h.dispatchEvent(down);
    expect(down.defaultPrevented).toBe(true);
    expect(h.classList.contains('active')).toBe(true);
    expect(h.setPointerCapture).toHaveBeenCalledWith(7);

    h.dispatchEvent(pointer('pointermove', 300));
    await settle(el);
    const first = widthPx(el);
    h.dispatchEvent(pointer('pointermove', 380));
    await settle(el);
    expect(widthPx(el) - first).toBe(80);
  });

  it('ending the drag releases everything; later moves no longer resize', async () => {
    const { el, h } = await mount();
    h.dispatchEvent(pointer('pointerdown', 100));
    h.dispatchEvent(pointer('pointermove', 300));
    await settle(el);
    const settled = widthPx(el);

    // releasePointerCapture throwing (capture already lost) must not abort cleanup.
    h.dispatchEvent(pointer('pointerup', 300));
    expect(h.classList.contains('active')).toBe(false);
    h.dispatchEvent(pointer('pointermove', 900));
    await settle(el);
    expect(widthPx(el)).toBe(settled);
  });

  it('pointercancel ends the drag the same way', async () => {
    const { h } = await mount();
    h.dispatchEvent(pointer('pointerdown', 100));
    h.dispatchEvent(pointer('pointercancel', 100));
    expect(h.classList.contains('active')).toBe(false);
  });

  it('a pointerdown on the handle does not sort the column', async () => {
    const { el, h } = await mount();
    const sort = vi.fn();
    el.addEventListener('mp-datatable-sort-change', sort);
    h.dispatchEvent(pointer('pointerdown', 100));
    h.dispatchEvent(pointer('pointerup', 100));
    h.click();
    expect(sort).not.toHaveBeenCalled();
  });

  it('turning resizable-columns off removes the handles', async () => {
    const { el } = await mount();
    el.resizableColumns = false;
    await settle(el);
    expect(handle(el)).toBeNull();
  });
});
