import { afterEach, describe, expect, it, vi } from 'vitest';
import './mp-datatable';
import type { MpDatatable } from './mp-datatable';
import type { DatatableColumnDef } from '../types';
import {
  fittedColumnWidth,
  KEYBOARD_RESIZE_STEP,
  MIN_COLUMN_WIDTH,
  RESIZE_TAP_SLOP,
  resizedColumnWidth,
} from './column-resize';

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

  it('a move inside the tap slop does not resize', async () => {
    const { el, h } = await mount();
    const before = th(el).style.width;
    h.dispatchEvent(pointer('pointerdown', 100));
    h.dispatchEvent(pointer('pointermove', 100 + RESIZE_TAP_SLOP));
    await settle(el);
    expect(th(el).style.width).toBe(before);
    h.dispatchEvent(pointer('pointercancel', 100));
  });

  it('a non-primary mouse button does not start a resize', async () => {
    const { h } = await mount();
    const down = new MouseEvent('pointerdown', { bubbles: true, cancelable: true, clientX: 100, button: 2 });
    Object.defineProperty(down, 'pointerId', { value: 7 });
    Object.defineProperty(down, 'pointerType', { value: 'mouse' });
    h.dispatchEvent(down);
    expect(down.defaultPrevented).toBe(false);
    expect(h.classList.contains('active')).toBe(false);
  });
});

describe('mp-datatable per-column resizable', () => {
  afterEach(() => { document.body.innerHTML = ''; });

  async function mountColumns(columns: DatatableColumnDef[], tableWide?: boolean): Promise<MpDatatable> {
    const el = document.createElement('mp-datatable') as MpDatatable;
    if (tableWide !== undefined) el.resizableColumns = tableWide;
    el.columns = columns;
    el.data = [{ id: 1, name: 'a', year: 1 }];
    document.body.appendChild(el);
    await settle(el);
    return el;
  }
  const handleOf = (el: MpDatatable, name: string) =>
    root(el).querySelector(`thead th[data-column="${name}"] .resize-handle`);

  it('resizable: false removes only that column\'s handle', async () => {
    const el = await mountColumns([{ name: 'name' }, { name: 'year', resizable: false }]);
    expect(handleOf(el, 'name')).not.toBeNull();
    expect(handleOf(el, 'year')).toBeNull();
  });

  it('resizable: true wins over a table that is not resizable', async () => {
    const el = await mountColumns([{ name: 'name' }, { name: 'year', resizable: true }], false);
    expect(handleOf(el, 'name')).toBeNull();
    expect(handleOf(el, 'year')).not.toBeNull();
  });
});

describe('mp-datatable initial width measurement (#426)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('pins measured widths rounded DOWN, so columns that fit cannot overflow', async () => {
    // jsdom has no layout; the stub stands in for a natural fractional width.
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      const width = this.tagName === 'TH' ? 296.43 : 0;
      return { width, height: 0, x: 0, y: 0, top: 0, left: 0, right: width, bottom: 0, toJSON: () => ({}) } as DOMRect;
    });
    const el = document.createElement('mp-datatable') as MpDatatable;
    el.columns = [{ name: 'name', label: 'Name' }] as DatatableColumnDef[];
    el.data = [{ id: 1, name: 'a' }];
    document.body.appendChild(el);
    await settle(el);
    await settle(el);
    expect(th(el).style.width).toBe('296px');
    expect(th(el).style.minWidth).toBe('296px');
  });
});

describe('fittedColumnWidth', () => {
  it('rounds the widest content up', () => {
    expect(fittedColumnWidth([80.2, 120.4, 99])).toBe(121);
  });

  it('never goes below the floor, and ignores unmeasurable entries', () => {
    expect(fittedColumnWidth([12, NaN])).toBe(MIN_COLUMN_WIDTH);
    expect(fittedColumnWidth([NaN])).toBeNull();
    expect(fittedColumnWidth([])).toBeNull();
  });
});

describe('mp-datatable resize options dialog', () => {
  afterEach(() => { document.body.innerHTML = ''; });

  const dialog = () => document.querySelector<HTMLElement>('.resize-panel');
  const button = (name: RegExp) =>
    [...document.querySelectorAll<HTMLButtonElement>('.resize-panel button')]
      .find((b) => name.test(b.getAttribute('aria-label') ?? b.textContent ?? ''))!;

  it('a tap on the handle opens a dialog named after the column', async () => {
    const { el, h } = await mount();
    h.dispatchEvent(pointer('pointerdown', 100));
    h.dispatchEvent(pointer('pointerup', 101));
    await settle(el);
    expect(dialog()?.getAttribute('role')).toBe('dialog');
    expect(dialog()?.getAttribute('aria-label')).toBe('Resize options for Name');
  });

  it('a drag does not open it', async () => {
    const { el, h } = await mount();
    h.dispatchEvent(pointer('pointerdown', 100));
    h.dispatchEvent(pointer('pointermove', 200));
    h.dispatchEvent(pointer('pointerup', 200));
    await settle(el);
    expect(dialog()).toBeNull();
  });

  it('Enter on the handle opens it; the step buttons resize relative to each other', async () => {
    const { el, h } = await mount();
    h.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    await settle(el);
    expect(dialog()).not.toBeNull();

    // Twice: jsdom has no layout, so the first step starts from 0 and lands on
    // the floor, where a step down would be clamped.
    button(/wider/i).click();
    await settle(el);
    button(/wider/i).click();
    await settle(el);
    const wider = widthPx(el);
    button(/narrower/i).click();
    await settle(el);
    expect(wider - widthPx(el)).toBe(KEYBOARD_RESIZE_STEP);
    expect(document.querySelector('.resize-panel output')?.textContent).toContain('px');
  });

  it('Reset drops a user width that had no measured or explicit width', async () => {
    const { el, h } = await mount();
    h.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    await settle(el);
    button(/wider/i).click();
    await settle(el);
    expect(th(el).style.width).not.toBe('');
    button(/reset/i).click();
    await settle(el);
    expect(th(el).style.width).toBe('');
  });

  it('a column made non-resizable loses its handle, so nothing can open the dialog', async () => {
    const { el } = await mount();
    el.columns = [{ name: 'name', label: 'Name', resizable: false }] as DatatableColumnDef[];
    await settle(el);
    expect(handle(el)).toBeNull();
    expect(dialog()).toBeNull();
  });
});
