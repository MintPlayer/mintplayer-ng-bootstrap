import { afterEach, describe, expect, it, vi } from 'vitest';
import './mp-datatable';
import type { MpDatatable, RowEventDetail, SelectionChangeEventDetail } from './mp-datatable';
import type { DatatableColumnDef, DatatableFetch, DatatableFetchRequest } from '../types';

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
const headerCheckbox = (el: MpDatatable) =>
  root(el).querySelector('thead th.checkbox-cell mp-checkbox') as HTMLElement & {
    updateComplete: Promise<unknown>;
    indeterminate: boolean;
  };
/**
 * Clicks the header checkbox's own native input (inside mp-checkbox's shadow
 * root), the real hit target, rather than dispatching a synthetic `change`:
 * this proves the activation reaches the clear, not only the handler.
 */
async function clickHeaderCheckbox(el: MpDatatable): Promise<void> {
  const header = headerCheckbox(el);
  await header.updateComplete;
  header.shadowRoot!.querySelector<HTMLInputElement>('input')!.click();
  await settle(el);
}

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
    await clickHeaderCheckbox(el);

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

  it('switching selection off clears any selection and reports the clear (D8)', async () => {
    const el = await mountFlat();
    el.selectedIds = ['1'];
    const events: SelectionChangeEventDetail[] = [];
    el.addEventListener('mp-datatable-selection-change', (e) =>
      events.push((e as CustomEvent<SelectionChangeEventDetail>).detail));
    el.selectionMode = 'none';
    await settle(el);
    expect(el.selectedIds).toEqual([]);
    expect(events).toEqual([{ selectedIds: [], selectedRows: [] }]);
  });

  it("switching selection off with nothing selected emits nothing", async () => {
    const el = await mountFlat();
    const spy = vi.fn();
    el.addEventListener('mp-datatable-selection-change', spy);
    el.selectionMode = 'none';
    await settle(el);
    expect(spy).not.toHaveBeenCalled();
  });

  it('Shift-click whose anchor is no longer in the data falls back to a plain select (D9)', async () => {
    const el = await mountFlat();
    click(rowEl(el, '2'));
    await settle(el);
    // Row 2 leaves the data; the anchor key now names nothing.
    el.data = FLAT.filter((r) => r.id !== 2);
    await settle(el);
    click(rowEl(el, '4'), { shiftKey: true });
    await settle(el);
    expect(selectedKeys(el)).toEqual(['4']);
    expect(el.selectedIds).toEqual(['4']);
  });

  it('double-click emits the row event with its row, index and key', async () => {
    const el = await mountFlat();
    const got: RowEventDetail[] = [];
    el.addEventListener('mp-datatable-row-dblclick', (e) => got.push((e as CustomEvent<RowEventDetail>).detail));
    rowEl(el, '2').dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(got.map((d) => [d.rowKey, d.rowIndex])).toEqual([['2', 1]]);
  });
});

function recordSelection(el: MpDatatable): SelectionChangeEventDetail<Row>[] {
  const out: SelectionChangeEventDetail<Row>[] = [];
  el.addEventListener('mp-datatable-selection-change', (e) =>
    out.push((e as CustomEvent<SelectionChangeEventDetail<Row>>).detail));
  return out;
}
function recordRowEvents(el: MpDatatable, type: string): string[] {
  const out: string[] = [];
  el.addEventListener(type, (e) => out.push((e as CustomEvent<RowEventDetail>).detail.rowKey));
  return out;
}
const checkboxCell = (el: MpDatatable, key: string) =>
  rowEl(el, key).querySelector<HTMLTableCellElement>('td.checkbox-cell')!;
const names = (rows: ReadonlyArray<Row | undefined>) => rows.map((r) => r?.name);

describe("mp-datatable 'checkbox' selection mode — only the checkbox selects", () => {
  afterEach(() => { document.body.innerHTML = ''; });

  it('a row click, plain, Ctrl or Shift, emits row-click and never selects', async () => {
    const el = await mountFlat('checkbox');
    const selections = recordSelection(el);
    const clicks = recordRowEvents(el, 'mp-datatable-row-click');

    click(rowEl(el, '1'));
    click(rowEl(el, '3'), { ctrlKey: true });
    click(rowEl(el, '2'), { metaKey: true });
    click(rowEl(el, '4'), { shiftKey: true });
    await settle(el);

    expect(clicks).toEqual(['1', '3', '2', '4']);
    expect(selections).toEqual([]);
    expect(selectedKeys(el)).toEqual([]);
    // The clicked row still takes the roving focus.
    expect(rowEl(el, '4').dataset['focused']).toBe('true');
  });

  it('a row click leaves an existing checkbox selection alone', async () => {
    const el = await mountFlat('checkbox');
    toggleCheckbox(el, '1');
    toggleCheckbox(el, '2');
    await settle(el);
    click(rowEl(el, '3'));
    click(rowEl(el, '4'), { shiftKey: true });
    await settle(el);
    expect(selectedKeys(el)).toEqual(['1', '2']);
  });

  it('the checkbox toggles additively, without modifiers', async () => {
    const el = await mountFlat('checkbox');
    const selections = recordSelection(el);
    toggleCheckbox(el, '1');
    toggleCheckbox(el, '3');
    toggleCheckbox(el, '1');
    await settle(el);
    expect(selections.map((d) => d.selectedIds)).toEqual([['1'], ['1', '3'], ['3']]);
    expect(names(selections[1].selectedRows)).toEqual(['Alpha', 'Gamma']);
  });

  it('a right-click on an unselected row changes nothing but still emits the menu event', async () => {
    const el = await mountFlat('checkbox');
    el.selectedIds = ['1'];
    await settle(el);
    const selections = recordSelection(el);
    const menus = recordRowEvents(el, 'mp-datatable-row-contextmenu');

    rowEl(el, '3').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    await settle(el);
    expect(menus).toEqual(['3']);
    expect(selections).toEqual([]);
    expect(el.selectedIds).toEqual(['1']);
  });

  it('a click on the checkbox td itself (its padding) toggles the row, and is no row click', async () => {
    const el = await mountFlat('checkbox');
    const selections = recordSelection(el);
    const clicks = recordRowEvents(el, 'mp-datatable-row-click');

    const td = checkboxCell(el, '2');
    expect(td.classList.contains('checkbox-cell-toggles')).toBe(true);
    click(td);
    await settle(el);
    expect(selections.map((d) => d.selectedIds)).toEqual([['2']]);
    expect(checkboxOf(el, '2').checked).toBe(true);

    click(checkboxCell(el, '2'));
    await settle(el);
    expect(selections.map((d) => d.selectedIds)).toEqual([['2'], []]);
    expect(clicks).toEqual([]);
  });

  it("a click that goes through the checkbox's own shadow root toggles exactly once", async () => {
    const el = await mountFlat('checkbox');
    const selections = recordSelection(el);
    const clicks = recordRowEvents(el, 'mp-datatable-row-click');

    const checkbox = rowEl(el, '3').querySelector('mp-checkbox') as HTMLElement & { updateComplete: Promise<unknown> };
    await checkbox.updateComplete;
    const input = checkbox.shadowRoot!.querySelector<HTMLInputElement>('input')!;
    let checkboxChanges = 0;
    checkbox.addEventListener('change', () => checkboxChanges++);
    // The native activation flips the input and mp-checkbox re-emits `change`;
    // the composed click then reaches the td, which must NOT toggle again.
    input.click();
    await settle(el);

    // Pins WHICH path produced the single toggle: the checkbox's own change,
    // not the td handler. Without this, a skipped native change plus a
    // guard-less td toggle would also yield exactly one selection event.
    expect(checkboxChanges).toBe(1);
    expect(selections.map((d) => d.selectedIds)).toEqual([['3']]);
    expect(selectedKeys(el)).toEqual(['3']);
    expect(clicks).toEqual([]);
  });

  it("in 'multiple' mode the td padding is inert: no toggle and no row click", async () => {
    const el = await mountFlat('multiple');
    const selections = recordSelection(el);
    const clicks = recordRowEvents(el, 'mp-datatable-row-click');
    const td = checkboxCell(el, '2');
    expect(td.classList.contains('checkbox-cell-toggles')).toBe(false);
    click(td);
    await settle(el);
    expect(selections).toEqual([]);
    expect(clicks).toEqual([]);
  });

  it('switching to checkbox mode keeps the checkbox column (multi-select)', async () => {
    const el = await mountFlat('single');
    expect(root(el).querySelector('tbody td.checkbox-cell')).toBeNull();
    el.selectionMode = 'checkbox';
    await settle(el);
    expect(root(el).querySelectorAll('tbody td.checkbox-cell')).toHaveLength(4);
    expect(root(el).querySelector('thead th.checkbox-cell mp-checkbox')).not.toBeNull();
  });
});

describe('mp-datatable checkbox cell double-click (D12)', () => {
  afterEach(() => { document.body.innerHTML = ''; });

  for (const mode of ['multiple', 'checkbox']) {
    it(`a double-click in the checkbox td emits no row-dblclick (${mode})`, async () => {
      const el = await mountFlat(mode);
      const dbl = recordRowEvents(el, 'mp-datatable-row-dblclick');
      checkboxCell(el, '2').dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      rowEl(el, '2').querySelector('mp-checkbox')!.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, composed: true }));
      expect(dbl).toEqual([]);

      // A data cell of the same row still opens it.
      rowEl(el, '2').querySelector<HTMLElement>('td:not(.checkbox-cell)')!
        .dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      expect(dbl).toEqual(['2']);
    });
  }
});

describe('mp-datatable selectedRows (D2–D4)', () => {
  afterEach(() => { document.body.innerHTML = ''; });

  it('seeding selectedIds with an unloaded key gives undefined at that index', async () => {
    const el = await mountFlat();
    el.selectedIds = ['1', '999'];
    await settle(el);
    expect(names(el.selectedRows as Row[])).toEqual(['Alpha', undefined]);

    const selections = recordSelection(el);
    toggleCheckbox(el, '2');
    await settle(el);
    expect(selections).toHaveLength(1);
    expect(selections[0].selectedIds).toEqual(['1', '999', '2']);
    expect(names(selections[0].selectedRows)).toEqual(['Alpha', undefined, 'Beta']);
  });

  it('the selectedRows setter replaces the selection, derives the keys and emits nothing', async () => {
    const el = await mountFlat();
    el.selectedIds = ['1'];
    const spy = vi.fn();
    el.addEventListener('mp-datatable-selection-change', spy);
    const offPage: Row = { id: 40, name: 'Forty' };

    el.selectedRows = [FLAT[2], offPage];
    await settle(el);
    expect(spy).not.toHaveBeenCalled();
    expect(el.selectedIds).toEqual(['3', '40']);
    expect(selectedKeys(el)).toEqual(['3']);
    // The seeded row is reported although it is not in the data.
    expect(el.selectedRows[1]).toBe(offPage);
  });

  it('an unchanged selectedIds push is a no-op that keeps the remembered rows', async () => {
    const el = await mountFlat();
    const offPage: Row = { id: 40, name: 'Forty' };
    el.selectedRows = [offPage];
    el.selectedIds = ['40'];
    expect(el.selectedRows[0]).toBe(offPage);
    // A changed push prunes the rows of keys that left.
    el.selectedIds = ['1'];
    el.selectedIds = ['1', '40'];
    expect(el.selectedRows[1]).toBeUndefined();
  });
});

describe('mp-datatable id-less rows on a paginated table (K1/K2, D7)', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  const IDLESS = [{ name: 'A' }, { name: 'B' }, { name: 'C' }, { name: 'D' }];

  async function mountIdless(mode: string): Promise<MpDatatable> {
    const el = document.createElement('mp-datatable') as MpDatatable;
    el.setAttribute('pagination', '');
    el.setAttribute('selection-mode', mode);
    el.perPage = 2;
    el.columns = columns;
    el.data = IDLESS;
    document.body.appendChild(el);
    await settle(el);
    return el;
  }

  const gotoPage = async (el: MpDatatable, page: number) => {
    root(el).querySelector('mp-pagination.datatable-pagination')!.dispatchEvent(
      new CustomEvent('mp-pagination-page-change', { detail: { page }, bubbles: true, composed: true }),
    );
    await settle(el);
  };
  const bodyKeys = (el: MpDatatable) =>
    Array.from(root(el).querySelectorAll<HTMLElement>('tbody tr[data-row-key]')).map((r) => r.dataset['rowKey']);

  it('keys rows by their global index, so page 1 and page 2 select distinct rows', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const el = await mountIdless('multiple');
    expect(bodyKeys(el)).toEqual(['row-0', 'row-1']);
    const selections = recordSelection(el);

    click(rowEl(el, 'row-0'));
    await gotoPage(el, 2);
    expect(bodyKeys(el)).toEqual(['row-2', 'row-3']);
    click(rowEl(el, 'row-2'), { ctrlKey: true });
    await settle(el);

    const last = selections.at(-1)!;
    expect(last.selectedIds).toEqual(['row-0', 'row-2']);
    expect((last.selectedRows as Array<{ name: string } | undefined>).map((r) => r?.name)).toEqual(['A', 'C']);
    // Page 2's first row is selected; page 1's first row is not mistaken for it.
    expect(selectedKeys(el)).toEqual(['row-2']);

    // Warned once, not per row or per render.
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain('rowKey');
  });

  it('a static, non-selectable table without ids does not warn', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await mountIdless('none');
    expect(warn).not.toHaveBeenCalled();
  });
});

/**
 * Selection on a server-paged (non-virtual) `fetch` table. Every response is a
 * FRESH set of row objects, the way a real server answers, so a selected row on
 * another page is only reportable because the element remembered it.
 */
describe('mp-datatable selection across fetch reloads', () => {
  afterEach(() => { document.body.innerHTML = ''; });

  const ALL: Row[] = Array.from({ length: 6 }, (_, i) => ({ id: i + 1, name: `r${i + 1}` }));

  function makeFetch(calls: DatatableFetchRequest[]): DatatableFetch<Row> {
    return async (req) => {
      calls.push({ ...req });
      const ordered = req.sortColumns[0]?.direction === 'descending' ? [...ALL].reverse() : ALL;
      const start = (req.page - 1) * req.perPage;
      return { data: ordered.slice(start, start + req.perPage).map((r) => ({ ...r })), totalRecords: ALL.length };
    };
  }

  async function mountFetched(mode = 'checkbox') {
    const calls: DatatableFetchRequest[] = [];
    const el = document.createElement('mp-datatable') as MpDatatable;
    el.setAttribute('pagination', '');
    el.setAttribute('selection-mode', mode);
    el.perPage = 2;
    el.columns = columns;
    el.fetch = makeFetch(calls) as DatatableFetch;
    document.body.appendChild(el);
    await settle(el);
    return { el, calls };
  }

  const gotoPage = async (el: MpDatatable, page: number) => {
    root(el).querySelector('mp-pagination.datatable-pagination')!.dispatchEvent(
      new CustomEvent('mp-pagination-page-change', { detail: { page }, bubbles: true, composed: true }),
    );
    await settle(el);
  };

  it('keeps off-page rows through a page change, a sort reload, a fetch re-assignment and reload()', async () => {
    const { el, calls } = await mountFetched();
    const selections = recordSelection(el);
    toggleCheckbox(el, '1');
    toggleCheckbox(el, '2');
    await settle(el);

    await gotoPage(el, 2);
    expect(calls.at(-1)).toMatchObject({ page: 2 });
    toggleCheckbox(el, '3');
    await settle(el);
    expect(selections.at(-1)!.selectedIds).toEqual(['1', '2', '3']);
    expect(names(selections.at(-1)!.selectedRows)).toEqual(['r1', 'r2', 'r3']);

    // Sort reload: the server now answers in descending order.
    root(el).querySelector<HTMLButtonElement>('th[data-column="name"] button.header-sort')!.click();
    await settle(el);
    root(el).querySelector<HTMLButtonElement>('th[data-column="name"] button.header-sort')!.click();
    await settle(el);
    expect(calls.at(-1)!.sortColumns).toEqual([{ property: 'name', direction: 'descending' }]);
    expect(el.selectedIds).toEqual(['1', '2', '3']);
    expect(names(el.selectedRows as Row[])).toEqual(['r1', 'r2', 'r3']);

    // A new callback reloads from scratch; the selection is not data.
    const before = calls.length;
    el.fetch = makeFetch(calls) as DatatableFetch;
    await settle(el);
    expect(calls.length).toBe(before + 1);
    expect(el.selectedIds).toEqual(['1', '2', '3']);
    expect(names(el.selectedRows as Row[])).toEqual(['r1', 'r2', 'r3']);

    el.reload();
    await settle(el);
    expect(calls.length).toBe(before + 2);
    expect(el.selectedIds).toEqual(['1', '2', '3']);
    expect(names(el.selectedRows as Row[])).toEqual(['r1', 'r2', 'r3']);

    // And the next user change still reports every row, the off-page ones included.
    const visible = Array.from(root(el).querySelectorAll<HTMLElement>('tbody tr[data-row-key]'))
      .map((r) => r.dataset['rowKey']!)
      .find((k) => !['1', '2', '3'].includes(k))!;
    toggleCheckbox(el, visible);
    await settle(el);
    expect(selections.at(-1)!.selectedIds).toEqual(['1', '2', '3', visible]);
    expect(names(selections.at(-1)!.selectedRows)).toEqual(['r1', 'r2', 'r3', `r${visible}`]);
  });

  it('a re-fetched row object replaces the remembered one', async () => {
    const { el } = await mountFetched();
    toggleCheckbox(el, '1');
    await settle(el);
    const remembered = el.selectedRows[0];
    el.reload();
    await settle(el);
    const live = el.selectedRows[0];
    expect(live).toEqual(remembered);
    expect(live).not.toBe(remembered);
  });

  it('works the same in the default multiple mode (row clicks)', async () => {
    const { el } = await mountFetched('multiple');
    click(rowEl(el, '1'));
    await gotoPage(el, 2);
    const selections = recordSelection(el);
    click(rowEl(el, '4'), { ctrlKey: true });
    await settle(el);
    expect(selections.at(-1)!.selectedIds).toEqual(['1', '4']);
    expect(names(selections.at(-1)!.selectedRows)).toEqual(['r1', 'r4']);
  });

  it('a selectedRows seed is reported after its page is gone', async () => {
    const { el } = await mountFetched();
    const seeded = el.selectedRows; // nothing yet
    expect(seeded).toEqual([]);
    const firstPageRow = el.data[0] as Row;
    el.selectedRows = [firstPageRow];
    await gotoPage(el, 3);
    const selections = recordSelection(el);
    toggleCheckbox(el, '5');
    await settle(el);
    expect(selections.at(-1)!.selectedIds).toEqual(['1', '5']);
    expect(selections.at(-1)!.selectedRows[0]).toBe(firstPageRow);
  });

  it('the header clear with off-page keys reports an empty selection', async () => {
    const { el } = await mountFetched();
    toggleCheckbox(el, '1');
    await gotoPage(el, 2);
    toggleCheckbox(el, '3');
    await settle(el);
    const selections = recordSelection(el);
    await clickHeaderCheckbox(el);
    expect(selections).toEqual([{ selectedIds: [], selectedRows: [] }]);
    expect(el.selectedIds).toEqual([]);
  });

  it('the header checkbox is visible and indeterminate when only off-page keys are selected', async () => {
    const { el } = await mountFetched();
    toggleCheckbox(el, '1');
    await gotoPage(el, 3);
    // Nothing on this page is selected, yet the selection is not empty.
    expect(selectedKeys(el)).toEqual([]);
    const header = headerCheckbox(el);
    expect(header.style.visibility).toBe('visible');
    expect(header.hasAttribute('aria-hidden')).toBe(false);
    expect(header.indeterminate).toBe(true);
  });

  it('a key seeded while its row is loaded is reported after its page is gone', async () => {
    const { el } = await mountFetched();
    el.selectedIds = ['1'];
    await gotoPage(el, 2);
    const selections = recordSelection(el);
    toggleCheckbox(el, '3');
    await settle(el);
    expect(selections.at(-1)!.selectedIds).toEqual(['1', '3']);
    expect(names(selections.at(-1)!.selectedRows)).toEqual(['r1', 'r3']);
  });

  it('keeps off-page rows through a perPage change', async () => {
    const { el, calls } = await mountFetched();
    toggleCheckbox(el, '1');
    await gotoPage(el, 2);
    toggleCheckbox(el, '3');
    await settle(el);

    el.perPage = 3;
    await settle(el);
    expect(calls.at(-1)).toMatchObject({ page: 1, perPage: 3 });
    expect(el.selectedIds).toEqual(['1', '3']);
    expect(names(el.selectedRows as Row[])).toEqual(['r1', 'r3']);

    // Page 2 at 3 per page holds rows 4-6: neither selected row is loaded now.
    await gotoPage(el, 2);
    const selections = recordSelection(el);
    toggleCheckbox(el, '5');
    await settle(el);
    expect(selections.at(-1)!.selectedIds).toEqual(['1', '3', '5']);
    expect(names(selections.at(-1)!.selectedRows)).toEqual(['r1', 'r3', 'r5']);
  });
});

describe('mp-datatable selection setters: unchanged pushes', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('a selectedIds push with a duplicate key is compared as a set, not by length', async () => {
    const el = await mountFlat();
    el.selectedIds = ['1', '2'];
    await settle(el);
    // Same length as the current selection, but the set {1} is not {1, 2}.
    el.selectedIds = ['1', '1'];
    await settle(el);
    expect(el.selectedIds).toEqual(['1']);
    expect(selectedKeys(el)).toEqual(['1']);
  });

  it('a selectedRows push of the same keys and row objects costs no update; any difference does', async () => {
    const el = await mountFlat();
    const offPage: Row = { id: 40, name: 'Forty' };
    el.selectedRows = [FLAT[0], offPage];
    await settle(el);
    const updates = vi.spyOn(el, 'requestUpdate');

    // A new array holding the same rows in the same order: unchanged.
    el.selectedRows = [FLAT[0], offPage];
    expect(updates).not.toHaveBeenCalled();

    // A fresher object for a key is a change, and is the one reported.
    const fresher: Row = { ...offPage };
    el.selectedRows = [FLAT[0], fresher];
    expect(updates).toHaveBeenCalled();
    expect(el.selectedRows[1]).toBe(fresher);

    // So is another order.
    updates.mockClear();
    el.selectedRows = [fresher, FLAT[0]];
    expect(updates).toHaveBeenCalled();
    expect(el.selectedIds).toEqual(['40', '1']);
  });
});
