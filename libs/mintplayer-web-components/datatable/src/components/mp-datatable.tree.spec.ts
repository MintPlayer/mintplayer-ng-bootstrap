import { afterEach, describe, expect, it, vi } from 'vitest';
import './mp-datatable';
import type { MpDatatable } from './mp-datatable';
import type {
  DatatableColumnDef,
  DatatableFetch,
  DatatableFetchRequest,
  TreeExpandedIdsChangeDetail,
  TreeRowExpandDetail,
} from '../types';

/**
 * Tree-mode keyboard (the treegrid pattern: ArrowRight expands, ArrowLeft
 * collapses; Enter opens and Space selects on every row, parents included —
 * D13) and the lazy child fetch expansion
 * triggers.
 */
interface Row { id: number; name: string; childCount?: number; }

const settle = async (el: MpDatatable): Promise<void> => {
  await el.updateComplete;
  await new Promise((r) => setTimeout(r));
  await el.updateComplete;
};

const root = (el: MpDatatable) => el.renderRoot as unknown as ParentNode;
const rowEl = (el: MpDatatable, key: string) =>
  root(el).querySelector<HTMLTableRowElement>(`tbody tr[data-row-key="${key}"]`);
const keys = (el: MpDatatable) =>
  Array.from(root(el).querySelectorAll<HTMLElement>('tbody tr[data-placeholder="false"]'))
    .map((r) => r.dataset['rowKey']);
const press = (target: HTMLElement, key: string, init: KeyboardEventInit = {}) => {
  const ev = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(ev);
  return ev;
};

async function mountTree(selectionMode: 'none' | 'multiple' | 'checkbox' = 'none') {
  const calls: DatatableFetchRequest[] = [];
  const fetchFn: DatatableFetch<Row> = async (req) => {
    calls.push(req);
    return req.parentId == null
      ? { data: [{ id: 1, name: 'parent', childCount: 1 }, { id: 2, name: 'leaf' }], totalRecords: 2 }
      : { data: [{ id: 10 + Number(req.parentId), name: 'child' }], totalRecords: 1 };
  };
  const el = document.createElement('mp-datatable') as MpDatatable;
  el.columns = [{ name: 'name', label: 'Name' }] as DatatableColumnDef[];
  el.tree = true;
  el.idKey = 'id';
  el.childCountKey = 'childCount';
  el.selectionMode = selectionMode;
  el.fetch = fetchFn as DatatableFetch;
  document.body.appendChild(el);
  await settle(el);
  return { el, calls };
}

describe('mp-datatable tree keyboard', () => {
  afterEach(() => { document.body.innerHTML = ''; });

  it('ArrowRight expands a collapsed parent, fetching its children once', async () => {
    const { el, calls } = await mountTree();
    const expands: TreeRowExpandDetail[] = [];
    const idChanges: Set<unknown>[] = [];
    el.addEventListener('mp-datatable-row-expand', (e) => expands.push((e as CustomEvent<TreeRowExpandDetail>).detail));
    el.addEventListener('mp-datatable-expanded-ids-change', (e) =>
      idChanges.push((e as CustomEvent<TreeExpandedIdsChangeDetail>).detail.expandedIds));

    press(rowEl(el, '1')!, 'ArrowRight');
    await settle(el);

    expect(keys(el)).toEqual(['1', '11', '2']);
    expect(expands).toHaveLength(1);
    expect(expands[0]).toMatchObject({ depth: 0, parentId: null });
    expect(idChanges.map((s) => [...s])).toEqual([[1]]);
    expect(calls.filter((c) => c.parentId === 1)).toHaveLength(1);

    // Already expanded: ArrowRight has nothing to do.
    press(rowEl(el, '1')!, 'ArrowRight');
    await settle(el);
    expect(expands).toHaveLength(1);
  });

  it('ArrowLeft collapses an expanded parent and emits the collapse; on a collapsed row it does nothing', async () => {
    const { el } = await mountTree();
    press(rowEl(el, '1')!, 'ArrowRight');
    await settle(el);

    const collapse = vi.fn();
    el.addEventListener('mp-datatable-row-collapse', collapse);
    press(rowEl(el, '1')!, 'ArrowLeft');
    await settle(el);
    expect(keys(el)).toEqual(['1', '2']);
    expect(collapse).toHaveBeenCalledOnce();
    expect(el.expandedIds.size).toBe(0);

    press(rowEl(el, '1')!, 'ArrowLeft');
    await settle(el);
    expect(collapse).toHaveBeenCalledOnce();
  });

  it('collapsing and re-expanding with the arrows reuses the cached children', async () => {
    const { el, calls } = await mountTree();
    press(rowEl(el, '1')!, 'ArrowRight');
    await settle(el);
    expect(keys(el)).toEqual(['1', '11', '2']);

    press(rowEl(el, '1')!, 'ArrowLeft');
    await settle(el);
    expect(keys(el)).toEqual(['1', '2']);

    press(rowEl(el, '1')!, 'ArrowRight');
    await settle(el);
    expect(keys(el)).toEqual(['1', '11', '2']);
    expect(calls.filter((c) => c.parentId === 1)).toHaveLength(1);
  });

  for (const mode of ['multiple', 'checkbox'] as const) {
    it(`Enter on a parent row opens it (row-click) and does not expand (D13, ${mode})`, async () => {
      const { el, calls } = await mountTree(mode);
      const clicks: string[] = [];
      el.addEventListener('mp-datatable-row-click', (e) => clicks.push((e as CustomEvent).detail.rowKey));
      const expand = vi.fn();
      el.addEventListener('mp-datatable-row-expand', expand);

      press(rowEl(el, '1')!, 'Enter');
      await settle(el);
      expect(clicks).toEqual(['1']);
      expect(expand).not.toHaveBeenCalled();
      expect(el.expandedIds.size).toBe(0);
      expect(keys(el)).toEqual(['1', '2']);
      expect(calls.filter((c) => c.parentId === 1)).toHaveLength(0);
      // Enter opens; only the default mode selects on the way.
      expect(el.selectedIds).toEqual(mode === 'multiple' ? ['1'] : []);
    });

    it(`Space on a parent row selects it and does not expand (D13, ${mode})`, async () => {
      const { el } = await mountTree(mode);
      const clicks: string[] = [];
      el.addEventListener('mp-datatable-row-click', (e) => clicks.push((e as CustomEvent).detail.rowKey));

      press(rowEl(el, '1')!, ' ');
      await settle(el);
      expect(el.expandedIds.size).toBe(0);
      expect(keys(el)).toEqual(['1', '2']);
      expect(el.selectedIds).toEqual(['1']);
      // The default mode's Space is a click-equivalent; 'checkbox' mode's is the checkbox only.
      expect(clicks).toEqual(mode === 'multiple' ? ['1'] : []);

      // The arrows still expand and collapse the same row.
      press(rowEl(el, '1')!, 'ArrowRight');
      await settle(el);
      expect(keys(el)).toEqual(['1', '11', '2']);
      press(rowEl(el, '1')!, 'ArrowLeft');
      await settle(el);
      expect(keys(el)).toEqual(['1', '2']);
    });
  }

  it('Enter on a parent row with selection off no longer expands it', async () => {
    const { el } = await mountTree();
    press(rowEl(el, '1')!, 'Enter');
    await settle(el);
    expect(el.expandedIds.size).toBe(0);
    expect(keys(el)).toEqual(['1', '2']);
  });

  it("Enter on a leaf in 'checkbox' mode opens it without selecting", async () => {
    const { el } = await mountTree('checkbox');
    const clicks: string[] = [];
    el.addEventListener('mp-datatable-row-click', (e) => clicks.push((e as CustomEvent).detail.rowKey));
    press(rowEl(el, '2')!, 'Enter');
    await settle(el);
    expect(clicks).toEqual(['2']);
    expect(el.selectedIds).toEqual([]);
    expect(el.expandedIds.size).toBe(0);
  });

  it('Enter on a leaf falls through to selection when rows are selectable', async () => {
    const { el } = await mountTree('multiple');
    press(rowEl(el, '2')!, 'Enter');
    await settle(el);
    expect(el.selectedIds).toEqual(['2']);
    expect(el.expandedIds.size).toBe(0);
  });

  it('Enter on a leaf with selection off does nothing and leaves the default alone', async () => {
    const { el } = await mountTree();
    const ev = press(rowEl(el, '2')!, 'Enter');
    await settle(el);
    expect(ev.defaultPrevented).toBe(false);
    expect(el.selectedIds).toEqual([]);
  });

  it('ArrowDown walks into the expanded child row', async () => {
    const { el } = await mountTree();
    press(rowEl(el, '1')!, 'ArrowRight');
    await settle(el);
    rowEl(el, '1')!.focus();
    press(rowEl(el, '1')!, 'ArrowDown');
    expect(document.activeElement).toBe(rowEl(el, '11'));
    // Past the last row there is nowhere to go: focus stays put.
    rowEl(el, '2')!.focus();
    press(rowEl(el, '2')!, 'ArrowDown');
    expect(document.activeElement).toBe(rowEl(el, '2'));
  });

  it('the chevron column is indented per depth level by tree-indent', async () => {
    const { el } = await mountTree();
    el.setAttribute('tree-indent', '2');
    press(rowEl(el, '1')!, 'ArrowRight');
    await settle(el);
    const cell = rowEl(el, '11')!.querySelector<HTMLElement>('td.tree-chevron-cell')!;
    expect(cell.style.paddingInlineStart).toBe('2rem');

    // A non-numeric attribute is ignored; a negative property write falls back to the default.
    el.setAttribute('tree-indent', 'wide');
    await settle(el);
    expect(el.treeIndent).toBe(2);
    el.treeIndent = -1;
    await settle(el);
    expect(el.treeIndent).toBe(1.25);
  });

  it('a row whose id cannot be extracted never toggles', async () => {
    const { el } = await mountTree();
    el.idKey = () => null;
    await settle(el);
    press(rowEl(el, '1')!, 'ArrowRight');
    await settle(el);
    expect(el.expandedIds.size).toBe(0);
  });
});
