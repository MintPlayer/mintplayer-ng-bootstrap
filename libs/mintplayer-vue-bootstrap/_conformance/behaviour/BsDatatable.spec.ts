import { describe, expect, it, vi } from 'vitest';
import { nextTick, toRaw } from 'vue';

import BsDatatable from '../../datatable/src/BsDatatable.vue';
import type { MpDatatable } from '@mintplayer/web-components/datatable';

import { emit, mountEl } from './harness';

/**
 * The datatable wrapper is the largest in the library and almost all of it is
 * one job: getting object-valued props onto the element as JS properties,
 * because Vue's attribute serialisation cannot carry an array, a `Set` or a
 * callback. Two rules inside `syncProps` are the ones that cause real bugs:
 *
 *  - **`fetch` and `data` are mutually exclusive.** While a fetch callback is
 *    set the web component owns the rows, so pushing `data` alongside it would
 *    clobber the fetched page. And clearing `fetch` at runtime has to null it
 *    on the element too, or it keeps server-paging forever against a source
 *    the consumer has dropped.
 *  - **Collections are copied, never aliased.** `expandedIds` arrives as a Set
 *    or an array and the element must get its own Set; handing over the
 *    consumer's instance makes the WC mutate application state behind its back.
 *
 * The other half is the event bridge: ten prefixed `mp-datatable-*` names
 * flattened to camelCase Vue events, plus two `update:` channels so
 * `v-model:expandedIds` and `v-model:selectedIds` work.
 */

const COLUMNS = [{ field: 'name', header: 'Name' }];
const DATA = [{ name: 'a' }, { name: 'b' }];

function mountTable(props: Record<string, unknown> = {}) {
  return mountEl<MpDatatable>(BsDatatable, 'mp-datatable', { props });
}

describe('BsDatatable — property sync', () => {
  it('pushes columns and data to the element', () => {
    const { el } = mountTable({ columns: COLUMNS, data: DATA });
    expect(el.columns).toEqual(COLUMNS);
    expect(el.data).toEqual(DATA);
  });

  // The element treats a missing columns array as a crash rather than an empty
  // table, so the wrapper substitutes one.
  it('substitutes empty arrays when nothing is given', () => {
    const { el } = mountTable();
    expect(el.columns).toEqual([]);
    expect(el.data).toEqual([]);
  });

  it('sets the fetch callback and leaves data alone', () => {
    const fetch = () => Promise.resolve({ data: [], totalRecords: 0 });
    const { el } = mountTable({ fetch, data: DATA });
    expect(el.fetch).toBe(fetch);
    expect(el.data).not.toEqual(DATA);
  });

  it('drops the stale callback and falls back to data when fetch is cleared', async () => {
    const fetch = () => Promise.resolve({ data: [], totalRecords: 0 });
    const { wrapper, el } = mountTable({ fetch, data: DATA });

    await wrapper.setProps({ fetch: null });

    expect(el.fetch).toBeNull();
    expect(el.data).toEqual(DATA);
  });

  it('re-syncs when the columns array is replaced', async () => {
    const { wrapper, el } = mountTable({ columns: COLUMNS });
    const replaced = [{ field: 'age', header: 'Age' }];

    await wrapper.setProps({ columns: replaced });

    expect(el.columns).toEqual(replaced);
  });

  it('copies an expandedIds Set rather than aliasing the consumer instance', () => {
    const ids = new Set(['a', 'b']);
    const { el } = mountTable({ expandedIds: ids });
    expect(el.expandedIds).toEqual(ids);
    expect(el.expandedIds).not.toBe(ids);
  });

  it('accepts expandedIds as a plain array and hands over a Set', () => {
    const { el } = mountTable({ expandedIds: ['a', 'b'] });
    expect(el.expandedIds).toBeInstanceOf(Set);
    expect([...(el.expandedIds as Set<unknown>)]).toEqual(['a', 'b']);
  });

  it('copies selectedIds', () => {
    const ids = ['x'];
    const { el } = mountTable({ selectedIds: ids });
    expect(el.selectedIds).toEqual(ids);
    expect(el.selectedIds).not.toBe(ids);
  });

  // `undefined` means "the consumer said nothing", which must leave the
  // element's own default in place rather than overwrite it with undefined.
  it('leaves untouched properties at their element defaults', () => {
    const { el } = mountTable();
    expect(el.tree).toBe(false);
    expect(el.selectionMode).not.toBeUndefined();
  });

  it('forwards the tree-mode properties when they are given', () => {
    // `rowKey` is a callback, not a field name — the element ignores anything
    // that is not a function, silently, so a string here would prove nothing.
    const rowKey = (row: unknown) => (row as { name: string }).name;
    const { el } = mountTable({
      tree: true,
      idKey: 'id',
      childCountKey: 'kids',
      treeIndent: 24,
      selectionMode: 'multiple',
      selectionStrategy: 'cascading',
      rowKey,
    });
    expect(el.tree).toBe(true);
    expect(el.idKey).toBe('id');
    expect(el.childCountKey).toBe('kids');
    expect(el.treeIndent).toBe(24);
    expect(el.selectionMode).toBe('multiple');
    expect(el.selectionStrategy).toBe('cascading');
    expect(el.rowKey).toBe(rowKey);
  });

  it('exposes the underlying element for advanced access', () => {
    const { wrapper, el } = mountTable();
    expect((wrapper.vm as unknown as { el: { value?: unknown } }).el).toBe(el);
  });
});

/**
 * `selectedRows` REPLACES the element's selection, so it must be pushed on
 * mount and on its own change only — never from the catch-all `syncProps`,
 * or an unrelated prop change would revert the user's clicks to the stale prop.
 */
describe('BsDatatable — selection seed, rowLabel and imperative API (#422, #407)', () => {
  interface Row { id: number; name: string; }
  const ROWS: Row[] = [{ id: 1, name: 'Alpha' }, { id: 2, name: 'Bravo' }];
  const COLS = [{ name: 'name', label: 'Name' }];
  const settle = () => new Promise((r) => setTimeout(r));

  it('seeds the selection from selectedRows: keys derived, an unloaded row remembered', () => {
    const offPage: Row = { id: 50, name: 'Not loaded' };
    const { el } = mountTable({ columns: COLS, data: ROWS, selectionMode: 'multiple', selectedRows: [ROWS[0], offPage] });
    expect(el.selectedIds).toEqual(['1', '50']);
    // Mounted props are reactive, so the element holds the proxy of the same object.
    expect(toRaw(el.selectedRows[1])).toBe(offPage);
  });

  it('does not re-push selectedRows when another prop changes, so a click survives', async () => {
    const seed = [ROWS[0]];
    const { wrapper, el } = mountTable({ columns: COLS, data: ROWS, selectionMode: 'multiple', selectedRows: seed });
    await el.updateComplete;
    const push = vi.spyOn(el, 'selectedRows', 'set');
    el.querySelector<HTMLElement>('tbody tr[data-row-key="2"]')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(el.selectedIds).toEqual(['2']);

    await wrapper.setProps({ rowLabel: (r: unknown) => (r as Row).name });
    await wrapper.setProps({ columns: [...COLS] });
    await wrapper.setProps({ selectionMode: 'checkbox' });
    expect(push).not.toHaveBeenCalled();
    expect(el.selectedIds).toEqual(['2']);

    // A new array is a new seed and does replace the selection.
    await wrapper.setProps({ selectedRows: [ROWS[0]] });
    expect(push).toHaveBeenCalledTimes(1);
    expect(el.selectedIds).toEqual(['1']);
  });

  it('does not re-push a one-way selectedIds when another prop changes, so a click survives', async () => {
    const { wrapper, el } = mountTable({ columns: COLS, data: ROWS, selectionMode: 'multiple', selectedIds: ['1'] });
    await el.updateComplete;
    const push = vi.spyOn(el, 'selectedIds', 'set');
    el.querySelector<HTMLElement>('tbody tr[data-row-key="2"]')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(el.selectedIds).toEqual(['2']);

    await wrapper.setProps({ rowLabel: (r: unknown) => (r as Row).name });
    await wrapper.setProps({ columns: [...COLS] });
    await wrapper.setProps({ data: [...ROWS] });
    expect(push).not.toHaveBeenCalled();
    expect(el.selectedIds).toEqual(['2']);

    // Its own change is still pushed.
    await wrapper.setProps({ selectedIds: ['1', '2'] });
    expect(push).toHaveBeenCalledTimes(1);
    expect(el.selectedIds).toEqual(['1', '2']);
  });

  it('a stale selectedIds never overrides a selectedRows seed', async () => {
    const offPage: Row = { id: 50, name: 'Not loaded' };
    const { wrapper, el } = mountTable({
      columns: COLS, data: ROWS, selectionMode: 'multiple', selectedIds: ['1'], selectedRows: [offPage],
    });
    // On mount the rows are pushed last, so the seed wins.
    expect(el.selectedIds).toEqual(['50']);
    await wrapper.setProps({ columns: [...COLS] });
    expect(el.selectedIds).toEqual(['50']);
    expect(toRaw(el.selectedRows[0])).toBe(offPage);

    // Both changing in one update: the rows are still pushed last.
    await wrapper.setProps({ selectedIds: ['2'], selectedRows: [ROWS[0]] });
    expect(el.selectedIds).toEqual(['1']);
  });

  it('does not re-push a one-way expandedIds when another prop changes', async () => {
    const { wrapper, el } = mountTable({ columns: COLS, data: ROWS, expandedIds: ['a'] });
    const push = vi.spyOn(el, 'expandedIds', 'set');
    await wrapper.setProps({ columns: [...COLS] });
    expect(push).not.toHaveBeenCalled();
    await wrapper.setProps({ expandedIds: ['b'] });
    expect(push).toHaveBeenCalledTimes(1);
    expect([...(el.expandedIds as Set<unknown>)]).toEqual(['b']);
  });

  it('forwards rowLabel and the checkbox selection mode', async () => {
    const rowLabel = (r: unknown) => `#${(r as Row).name}`;
    const { wrapper, el } = mountTable({ columns: COLS, data: ROWS, selectionMode: 'checkbox', rowLabel });
    expect(el.rowLabel).toBe(rowLabel);
    expect(el.selectionMode).toBe('checkbox');
    await wrapper.setProps({ rowLabel: null });
    expect(el.rowLabel).toBeNull();
  });

  it('exposes reload() and applyFetchState(), each costing one request', async () => {
    const calls: { page: number; perPage: number }[] = [];
    const fetch = async (req: { page: number; perPage: number }) => {
      calls.push({ page: req.page, perPage: req.perPage });
      return { data: ROWS, totalRecords: ROWS.length };
    };
    const { wrapper } = mountTable({ columns: COLS, fetch });
    await settle();
    expect(calls).toHaveLength(1);
    const vm = wrapper.vm as unknown as {
      reload: (o?: { resetPage?: boolean }) => void;
      applyFetchState: (s: Record<string, unknown>) => void;
    };

    vm.reload();
    await settle();
    expect(calls).toHaveLength(2);

    vm.applyFetchState({ fetch, perPage: 5, page: 1, sortColumns: [{ property: 'name', direction: 'ascending' }] });
    await settle();
    expect(calls).toHaveLength(3);
    expect(calls[2].perPage).toBe(5);
  });
});

describe('BsDatatable — event bridge', () => {
  const CASES: [string, string, Record<string, unknown>][] = [
    ['mp-datatable-row-expand', 'rowExpand', { row: { id: 1 } }],
    ['mp-datatable-row-collapse', 'rowCollapse', { row: { id: 1 } }],
    ['mp-datatable-sort-change', 'sortChange', { field: 'name', direction: 'asc' }],
    ['mp-datatable-row-click', 'rowClick', { row: { id: 1 } }],
    ['mp-datatable-row-dblclick', 'rowDblClick', { row: { id: 1 } }],
    ['mp-datatable-row-contextmenu', 'rowContextMenu', { row: { id: 1 } }],
    ['mp-datatable-page-change', 'pageChange', { page: 3 }],
    ['mp-datatable-per-page-change', 'perPageChange', { perPage: 50 }],
  ];

  it.each(CASES)('flattens %s to the %s event', async (domEvent, vueEvent, detail) => {
    const { wrapper, el } = mountTable();

    await emit(el, domEvent, detail);

    expect(wrapper.emitted(vueEvent), `${domEvent} never reached ${vueEvent}`).toHaveLength(1);
    expect(wrapper.emitted(vueEvent)![0]).toEqual([detail]);
  });

  // The expansion channel is a v-model, so it emits a fresh Set rather than the
  // detail — a consumer binding it must not receive the element's own instance.
  it('emits expandedIds as a new Set on the v-model channel', async () => {
    const { wrapper, el } = mountTable();
    const expandedIds = ['a', 'b'];

    await emit(el, 'mp-datatable-expanded-ids-change', { expandedIds });

    const emitted = wrapper.emitted('update:expandedIds')![0][0] as Set<unknown>;
    expect(emitted).toBeInstanceOf(Set);
    expect([...emitted]).toEqual(expandedIds);
  });

  // Selection is the one event with two consumers: the detail-carrying
  // notification AND the v-model write-back. Dropping either is silent.
  it('emits both selectionChange and the selectedIds v-model on one event', async () => {
    const { wrapper, el } = mountTable();
    const detail = { selectedIds: ['x', 'y'], selectedRows: [{ id: 'x' }] };

    await emit(el, 'mp-datatable-selection-change', detail);

    expect(wrapper.emitted('selectionChange')![0]).toEqual([detail]);
    expect(wrapper.emitted('update:selectedIds')![0]).toEqual([['x', 'y']]);
  });

  it('copies the selected ids out of the detail', async () => {
    const { wrapper, el } = mountTable();
    const selectedIds = ['x'];

    await emit(el, 'mp-datatable-selection-change', { selectedIds, selectedRows: [] });

    expect(wrapper.emitted('update:selectedIds')![0][0]).not.toBe(selectedIds);
  });

  // Listeners are added in `onMounted`; leaving them attached after teardown
  // keeps the component alive through the element's reference to its handlers.
  it('stops emitting once unmounted', async () => {
    const { wrapper, el } = mountTable();
    wrapper.unmount();

    el.dispatchEvent(new CustomEvent('mp-datatable-row-click', { detail: { row: {} } }));
    await nextTick();

    expect(wrapper.emitted('rowClick')).toBeUndefined();
  });
});

describe('BsDatatable — per-column label and resizable (#426)', () => {
  it('both reach the element through the column defs', async () => {
    const { el } = mountTable({
      columns: [
        { name: 'name', label: 'Artist' },
        { name: 'id', label: 'Id', resizable: false },
      ],
      data: [{ id: 1, name: 'a' }],
    });
    await el.updateComplete;
    const handle = (column: string) =>
      el.querySelector(`thead tr:first-child th[data-column="${column}"] .resize-handle`);
    expect(handle('name')?.getAttribute('aria-label')).toBe('Resize column Artist');
    expect(handle('id')).toBeNull();
  });
});
