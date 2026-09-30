import { afterEach, describe, expect, it, vi } from 'vitest';
import './mp-datatable';
import type { MpDatatable, RowEventDetail, SelectionChangeEventDetail } from './mp-datatable';
import type { DatatableColumnDef, DatatableFetch } from '../types';

/**
 * Selection behaviour beyond the plain click: cascading tree selection and its
 * indeterminate parents, the header deselect-all affordance, context-menu
 * promotion, and the pointer modifiers (Ctrl toggle, Shift range).
 */
interface Row { id: number; name: string; childCount?: number; }

const FLAT: Row[] = [
  { id: 1, name: 'Alpha' },
  { id: 2, name: 'Beta' },
  { id: 3, name: 'Gamma' },
  { id: 4, name: 'Delta' },
];

const columns: DatatableColumnDef[] = [{ name: 'name', label: 'Name' }];

const settle = async (el: MpDatatable): Promise<void> => {
  await el.updateComplete;
  await new Promise((r) => setTimeout(r));
  await el.updateComplete;
};

const root = (el: MpDatatable) => el.renderRoot as unknown as ParentNode;
const rowEl = (el: MpDatatable, key: string) =>
  root(el).querySelector<HTMLTableRowElement>(`tbody tr[data-row-key="${key}"]`)!;
const selectedKeys = (el: MpDatatable) =>
  Array.from(root(el).querySelectorAll<HTMLElement>('tbody tr[data-selected="true"]'))
    .map((r) => r.dataset['rowKey']);
const toggleCheckbox = (el: MpDatatable, key: string) =>
  rowEl(el, key).querySelector('mp-checkbox')!.dispatchEvent(new CustomEvent('change'));
const click = (target: HTMLElement, init: MouseEventInit = {}) =>
  target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ...init }));

async function mountFlat(mode = 'multiple'): Promise<MpDatatable> {
  const el = document.createElement('mp-datatable') as MpDatatable;
  el.setAttribute('selection-mode', mode);
  el.columns = columns;
  el.data = FLAT;
  document.body.appendChild(el);
  await settle(el);
  return el;
}

/**
 * A fetch-driven tree: root 1 has two children (11, 12), and child 11 has two
 * of its own (111, 112). Children only exist once fetched, which is what
 * "currently-loaded descendants" means for cascading.
 */
async function mountTree(strategy: 'flat' | 'cascading'): Promise<MpDatatable> {
  const children: Record<number, Row[]> = {
    1: [{ id: 11, name: 'one-one', childCount: 2 }, { id: 12, name: 'one-two' }],
    11: [{ id: 111, name: 'leaf-a' }, { id: 112, name: 'leaf-b' }],
  };
  const fetchFn: DatatableFetch<Row> = async (req) => req.parentId == null
    ? { data: [{ id: 1, name: 'one', childCount: 2 }, { id: 2, name: 'two' }], totalRecords: 2 }
    : { data: children[req.parentId as number] ?? [], totalRecords: (children[req.parentId as number] ?? []).length };

  const el = document.createElement('mp-datatable') as MpDatatable;
  el.columns = columns;
  el.tree = true;
  el.idKey = 'id';
  el.childCountKey = 'childCount';
  el.selectionMode = 'multiple';
  el.selectionStrategy = strategy;
  el.fetch = fetchFn as DatatableFetch;
  document.body.appendChild(el);
  await settle(el);
  return el;
}

async function expand(el: MpDatatable, key: string): Promise<void> {
  rowEl(el, key).querySelector<HTMLButtonElement>('button.tree-chevron')!.click();
  await settle(el);
}

const checkboxOf = (el: MpDatatable, key: string) =>
  rowEl(el, key).querySelector('mp-checkbox') as unknown as { checked: boolean; indeterminate: boolean };

describe('mp-datatable cascading tree selection', () => {
  afterEach(() => { document.body.innerHTML = ''; });

  it('checking a parent selects every loaded descendant, and unchecking deselects them again', async () => {
    const el = await mountTree('cascading');
    await expand(el, '1');
    await expand(el, '11');

    const events: string[][] = [];
    el.addEventListener('mp-datatable-selection-change', (e) =>
      events.push((e as CustomEvent<SelectionChangeEventDetail>).detail.selectedIds));

    toggleCheckbox(el, '1');
    await settle(el);
    expect(new Set(selectedKeys(el))).toEqual(new Set(['1', '11', '12', '111', '112']));

    toggleCheckbox(el, '1');
    await settle(el);
    expect(selectedKeys(el)).toEqual([]);
    expect(events).toHaveLength(2);
    expect(events[1]).toEqual([]);
  });

  it('marks a parent indeterminate while only part of its loaded subtree is selected', async () => {
    const el = await mountTree('cascading');
    await expand(el, '1');
    await expand(el, '11');

    toggleCheckbox(el, '111');
    await settle(el);
    // One of four loaded descendants of 1, one of two of 11: both partial.
    expect(checkboxOf(el, '1').indeterminate).toBe(true);
    expect(checkboxOf(el, '11').indeterminate).toBe(true);
    // Leaves and the unrelated root have no subtree to be partial about.
    expect(checkboxOf(el, '12').indeterminate).toBe(false);
    expect(checkboxOf(el, '2').indeterminate).toBe(false);

    toggleCheckbox(el, '112');
    await settle(el);
    // 11's subtree is now fully selected — no longer partial; 1's still is.
    expect(checkboxOf(el, '11').indeterminate).toBe(false);
    expect(checkboxOf(el, '1').indeterminate).toBe(true);
  });

  it('the flat strategy toggles only the row itself and never reports indeterminate parents', async () => {
    const el = await mountTree('flat');
    await expand(el, '1');

    toggleCheckbox(el, '1');
    await settle(el);
    expect(selectedKeys(el)).toEqual(['1']);

    toggleCheckbox(el, '11');
    toggleCheckbox(el, '1');
    await settle(el);
    expect(selectedKeys(el)).toEqual(['11']);
    expect(checkboxOf(el, '1').indeterminate).toBe(false);
  });

  it('cascading on a parent whose children were never loaded selects only the parent', async () => {
    const el = await mountTree('cascading');
    toggleCheckbox(el, '1');
    await settle(el);
    expect(selectedKeys(el)).toEqual(['1']);
  });
});

describe('mp-datatable deselect-all header checkbox', () => {
  afterEach(() => { document.body.innerHTML = ''; });

  const header = (el: MpDatatable) => root(el).querySelector<HTMLElement>('thead th.checkbox-cell mp-checkbox')!;

  it('is hidden from AT until something is selected, then clears the whole selection', async () => {
    const el = await mountFlat();
    expect(header(el).getAttribute('aria-hidden')).toBe('true');

    el.selectedIds = ['1', '3'];
    await settle(el);
    expect(header(el).hasAttribute('aria-hidden')).toBe(false);
    expect((header(el) as unknown as { indeterminate: boolean }).indeterminate).toBe(true);

    const events: string[][] = [];
    el.addEventListener('mp-datatable-selection-change', (e) =>
      events.push((e as CustomEvent<SelectionChangeEventDetail>).detail.selectedIds));
    header(el).dispatchEvent(new CustomEvent('change'));
    await settle(el);

    expect(selectedKeys(el)).toEqual([]);
    expect(events).toEqual([[]]);
    expect(header(el).getAttribute('aria-hidden')).toBe('true');
  });

  it('emits nothing when there is nothing to deselect', async () => {
    const el = await mountFlat();
    const spy = vi.fn();
    el.addEventListener('mp-datatable-selection-change', spy);
    header(el).dispatchEvent(new CustomEvent('change'));
    await settle(el);
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('mp-datatable context menu', () => {
  afterEach(() => { document.body.innerHTML = ''; });

  const contextmenu = (target: HTMLElement) => {
    const ev = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
    target.dispatchEvent(ev);
    return ev;
  };

  it('promotes an unselected row to the whole selection before emitting the cancelable event', async () => {
    const el = await mountFlat();
    el.selectedIds = ['1', '2'];
    await settle(el);

    const selections: string[][] = [];
    const menus: RowEventDetail[] = [];
    el.addEventListener('mp-datatable-selection-change', (e) =>
      selections.push((e as CustomEvent<SelectionChangeEventDetail>).detail.selectedIds));
    el.addEventListener('mp-datatable-row-contextmenu', (e) => {
      expect(e.cancelable).toBe(true);
      // The selection is already promoted when the consumer's menu opens.
      expect(el.selectedIds).toEqual(['3']);
      menus.push((e as CustomEvent<RowEventDetail>).detail);
    });

    contextmenu(rowEl(el, '3'));
    await settle(el);

    expect(selections).toEqual([['3']]);
    expect(menus.map((d) => [d.rowKey, d.rowIndex, (d.row as Row).name])).toEqual([['3', 2, 'Gamma']]);
    expect(rowEl(el, '3').dataset['focused']).toBe('true');
  });

  it('keeps a multi selection intact when the right-clicked row is already part of it', async () => {
    const el = await mountFlat();
    el.selectedIds = ['1', '2'];
    await settle(el);
    const spy = vi.fn();
    el.addEventListener('mp-datatable-selection-change', spy);

    contextmenu(rowEl(el, '2'));
    await settle(el);
    expect(spy).not.toHaveBeenCalled();
    expect(selectedKeys(el)).toEqual(['1', '2']);
  });

  it('never selects when selection is off, but still emits the menu event', async () => {
    const el = await mountFlat('none');
    const menu = vi.fn();
    el.addEventListener('mp-datatable-row-contextmenu', menu);
    contextmenu(rowEl(el, '1'));
    await settle(el);
    expect(menu).toHaveBeenCalledOnce();
    expect(el.selectedIds).toEqual([]);
  });

  it('cancelling the row event suppresses the native menu; not cancelling leaves it alone', async () => {
    const el = await mountFlat();
    expect(contextmenu(rowEl(el, '2')).defaultPrevented).toBe(false);

    el.addEventListener('mp-datatable-row-contextmenu', (e) => e.preventDefault());
    expect(contextmenu(rowEl(el, '1')).defaultPrevented).toBe(true);
  });
});

describe('mp-datatable pointer selection modifiers', () => {
  afterEach(() => { document.body.innerHTML = ''; });

  it('Ctrl-click adds and removes single rows without clearing the rest', async () => {
    const el = await mountFlat();
    click(rowEl(el, '1'));
    click(rowEl(el, '3'), { ctrlKey: true });
    await settle(el);
    expect(selectedKeys(el)).toEqual(['1', '3']);

    click(rowEl(el, '1'), { metaKey: true });
    await settle(el);
    expect(selectedKeys(el)).toEqual(['3']);
  });

  it('Shift-click selects the range from the anchor, in either direction', async () => {
    const el = await mountFlat();
    click(rowEl(el, '3'));
    click(rowEl(el, '1'), { shiftKey: true });
    await settle(el);
    expect(selectedKeys(el)).toEqual(['1', '2', '3']);

    // The anchor stayed on row 3 (shift never moves it): a downward range now.
    click(rowEl(el, '4'), { shiftKey: true });
    await settle(el);
    expect(selectedKeys(el)).toEqual(['1', '2', '3', '4']);
  });

  it('Shift-click with no anchor yet is a plain selection', async () => {
    const el = await mountFlat();
    click(rowEl(el, '2'), { shiftKey: true });
    await settle(el);
    expect(selectedKeys(el)).toEqual(['2']);
  });

  it('single mode replaces the selection on every click, modifiers or not', async () => {
    const el = await mountFlat('single');
    click(rowEl(el, '1'));
    click(rowEl(el, '2'), { ctrlKey: true });
    await settle(el);
    expect(selectedKeys(el)).toEqual(['2']);
  });

  it('switching selection off clears any selection', async () => {
    const el = await mountFlat();
    el.selectedIds = ['1'];
    el.selectionMode = 'none';
    await settle(el);
    expect(el.selectedIds).toEqual([]);
  });

  it('double-click emits the row event with its row, index and key', async () => {
    const el = await mountFlat();
    const got: RowEventDetail[] = [];
    el.addEventListener('mp-datatable-row-dblclick', (e) => got.push((e as CustomEvent<RowEventDetail>).detail));
    rowEl(el, '2').dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(got.map((d) => [d.rowKey, d.rowIndex])).toEqual([['2', 1]]);
  });
});
