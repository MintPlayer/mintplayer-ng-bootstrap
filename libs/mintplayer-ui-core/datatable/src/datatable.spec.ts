import { describe, expect, it, vi } from 'vitest';
import { coreRuntime } from '@mintplayer/ui-core/component';
import {
  activeFilter,
  bucketDistincts,
  connectDatatable,
  datatableModel,
  defaultRowKey,
  filterOptionsOf,
  localDistincts,
  operandText,
  parseOperand,
  requestFilters,
  selectionFromFilter,
  withFilter,
  type DatatableFilterCommands,
  type DatatableModelInput,
  type DatatableOptions,
} from './datatable';
import { datatableCore, requestKeyOf, type DatatableInputs } from './datatable.core';
import type { DatatableColumnDef } from './types/column-def';
import { DEFAULT_DATATABLE_LABELS } from './types/labels';

interface Artist {
  id: number;
  name: string;
  year: number;
}

const ROWS: Artist[] = [
  { id: 1, name: 'Queen', year: 1970 },
  { id: 2, name: 'ABBA', year: 1972 },
  { id: 3, name: 'Muse', year: 1994 },
];

const COLUMNS: DatatableColumnDef[] = [
  { name: 'name', label: 'Name' },
  { name: 'year', label: 'Year', sortable: false },
];

const model = (o: Partial<DatatableModelInput> = {}) =>
  datatableModel({
    rows: ROWS,
    totalRecords: null,
    pageCache: new Map(),
    childCache: new Map(),
    childTotals: new Map(),
    tree: false,
    virtualScroll: false,
    pagination: false,
    autoSort: true,
    sortColumns: [],
    page: 1,
    perPage: 20,
    rowKey: defaultRowKey,
    idKey: null,
    childCountKey: null,
    expandedIds: [],
    ...o,
  });

const noCommands: DatatableFilterCommands = {
  search: () => undefined,
  apply: () => undefined,
  compare: () => undefined,
  clear: () => undefined,
  close: () => undefined,
};

const options = (o: Partial<DatatableOptions> = {}): DatatableOptions => ({
  id: 'dt',
  model: model(),
  columns: COLUMNS,
  selectionMode: 'none',
  selectedIds: [],
  cutIds: [],
  focusedKey: null,
  tree: false,
  treeIndent: 1.25,
  sortColumns: [],
  page: 1,
  perPage: 20,
  perPageOptions: [10, 20],
  pagination: false,
  loading: false,
  busy: false,
  emptyMessage: 'No data',
  caption: null,
  label: null,
  fill: false,
  virtualScroll: false,
  itemSize: 40,
  virtualBuffer: 0,
  scrollTop: 0,
  viewport: 480,
  resizableColumns: false,
  columnWidths: {},
  measured: false,
  tableWidth: null,
  resizeColumn: null,
  resizeWidth: 0,
  indeterminate: new Set(),
  rowLabel: null,
  hrefFor: null,
  announcement: '',
  headerHeight: 0,
  filter: { column: null, selections: {}, operandTexts: {}, values: null, loading: false, term: '', commands: noCommands },
  ...o,
});

describe('datatableModel', () => {
  it('sorts local rows and pages them', () => {
    const m = model({ sortColumns: [{ property: 'name', direction: 'ascending' }], pagination: true, perPage: 2 });
    expect(m.list.map((r) => (r.row as Artist).name)).toEqual(['ABBA', 'Muse']);
    expect(m.totalPages).toBe(2);
  });
});

describe('connectDatatable', () => {
  it('renders a plain table with sortable headers and cell text', () => {
    const view = connectDatatable(options());
    expect(view.table['role']).toBeNull();
    expect(view.headers.map((h) => h.sortable)).toEqual([true, false]);
    expect(view.headers[0].th['aria-sort']).toBe('none');
    expect(view.rows.map((r) => r.cells[0].text)).toEqual(['Queen', 'ABBA', 'Muse']);
    expect(view.rows[0].tr['aria-rowindex']).toBe(2);
    expect(view.filterRow).toBeNull();
  });

  it('makes a resize grip a focusable separator only once its column has a width (axe aria-required-attr)', () => {
    const unmeasured = connectDatatable(options({ resizableColumns: true })).headers[0].resize!;
    expect(unmeasured).toMatchObject({ 'aria-hidden': 'true' });
    expect(unmeasured).not.toHaveProperty('role');
    expect(unmeasured).not.toHaveProperty('tabindex');
    const measured = connectDatatable(options({ resizableColumns: true, columnWidths: { name: 180.4 } })).headers[0].resize!;
    expect(measured).toMatchObject({ role: 'separator', tabindex: 0, 'aria-valuenow': 180 });
  });

  it('is a multiselectable grid with named row checkboxes in checkbox mode', () => {
    const view = connectDatatable(options({ selectionMode: 'checkbox', selectedIds: ['2'] }));
    expect(view.table['role']).toBe('grid');
    expect(view.table['aria-multiselectable']).toBe('true');
    expect(view.rows[1].tr['aria-selected']).toBe('true');
    expect(view.rows[1].checked).toBe(true);
    expect(view.rows[0].check?.['aria-label']).toBe(DEFAULT_DATATABLE_LABELS.selectRowNamed('Queen'));
    expect(view.anySelected).toBe(true);
  });

  it('adds a filter row, shifting the row indices, with a popover per filterable column', () => {
    const columns: DatatableColumnDef[] = [{ ...COLUMNS[0], filterable: true }, COLUMNS[1]];
    const view = connectDatatable(options({ columns }));
    expect(view.filterRow?.['aria-rowindex']).toBe(2);
    expect(view.rows[0].tr['aria-rowindex']).toBe(3);
    expect(view.table['aria-rowcount']).toBe(5);
    const [name, year] = view.filterCells;
    expect(name.trigger?.['popovertarget']).toBe('dt-filter-name');
    expect(name.trigger?.['aria-expanded']).toBe('false');
    expect(name.panel?.['role']).toBe('dialog');
    expect(name.open).toBeNull();
    expect(year.trigger).toBeNull();
  });

  it('lists the open values panel with the selection first', () => {
    const columns: DatatableColumnDef[] = [{ ...COLUMNS[0], filterable: true }];
    const values = localDistincts(ROWS, 'name', DEFAULT_DATATABLE_LABELS);
    const view = connectDatatable(
      options({
        columns,
        filter: {
          column: 'name',
          selections: { name: { values: [{ value: 'Muse', label: 'Muse' }], inverse: false } },
          operandTexts: {},
          values,
          loading: false,
          term: '',
          commands: noCommands,
        },
      }),
    );
    const open = view.filterCells[0].open!;
    expect(view.filterCells[0].trigger?.['aria-expanded']).toBe('true');
    expect(open.list?.options.map((o) => [o.text, o.checked])).toEqual([
      ['Muse', true],
      ['ABBA', false],
      ['Queen', false],
    ]);
    expect(open.clear['disabled']).toBe(false);
    expect(open.comparison).toBeNull();
  });

  it('offers operators and echoes the raw operand text in comparison mode', () => {
    const columns: DatatableColumnDef[] = [{ ...COLUMNS[1], filterable: true, filterMode: 'comparison', filterOperators: ['gt', 'lt'] }];
    const view = connectDatatable(
      options({
        columns,
        filter: {
          column: 'year',
          selections: { year: { values: [], inverse: false, operator: 'lt', operand: null } },
          operandTexts: { year: '-' },
          values: null,
          loading: false,
          term: '',
          commands: noCommands,
        },
      }),
    );
    const comparison = view.filterCells[0].open!.comparison!;
    expect(comparison.operatorValue).toBe('lt');
    expect(comparison.operators.map((o) => o.option['selected'])).toEqual([false, true]);
    expect(comparison.operandText).toBe('-');
    expect(view.filterCells[0].open!.clear['disabled']).toBe(true);
  });
});

describe('filter helpers', () => {
  it('parses operands: empty and NaN are no filter, dates stay ISO strings', () => {
    expect(parseOperand('', 'number')).toBeNull();
    expect(parseOperand('1e', 'number')).toBeNull();
    expect(parseOperand('42', undefined)).toBe(42);
    expect(parseOperand('2026-10-28', 'date')).toBe('2026-10-28');
  });

  it('keeps snapshot values that left the data in the remaining bucket, narrowed by the term', () => {
    const snapshot = [
      { value: 'ABBA', label: 'ABBA' },
      { value: 'Muse', label: 'Muse' },
    ];
    const loaded = { matching: [{ value: 'Muse', label: 'Muse' }], remaining: [], hasMore: false };
    expect(bucketDistincts(loaded, snapshot, '')).toEqual({ matching: [snapshot[1]], remaining: [snapshot[0]], hasMore: false });
    expect(bucketDistincts(loaded, snapshot, 'ab')).toEqual({ matching: [], remaining: [snapshot[0]], hasMore: false });
  });

  it('matches NaN to itself when listing options', () => {
    const selection = { values: [{ value: NaN, label: 'NaN' }], inverse: false };
    const values = { matching: [{ value: NaN, label: 'NaN' }, { value: 1, label: '1' }], remaining: [], hasMore: false };
    expect(filterOptionsOf(selection, values).map((v) => v.label)).toEqual(['NaN', '1']);
  });

  it('turns a local datetime into the UTC instant it names, and shows it back as local text (#448 D10)', () => {
    const instant = parseOperand('2026-03-01T09:30', 'datetime') as string;
    expect(instant).toMatch(/Z$/);
    expect(instant).toBe(new Date(2026, 2, 1, 9, 30).toISOString());
    expect(operandText(instant, 'datetime')).toBe('2026-03-01T09:30');
    expect(parseOperand('2026-03-01', 'datetime')).toBeNull();
    expect(operandText(42, 'number')).toBe('42');
  });

  it('sends only active filters, and drops an emptied column from the model', () => {
    expect(activeFilter({ values: [], inverse: true }, 'values')).toBeNull();
    expect(activeFilter({ values: [{ value: 'BE', label: 'Belgium' }], inverse: true }, 'values')).toEqual({ values: ['BE'], inverse: true });
    expect(activeFilter({ values: [], inverse: false, operator: 'gte', operand: null }, 'comparison')).toBeNull();
    expect(activeFilter({ values: [], inverse: false, operator: 'gte', operand: 3 }, 'comparison')).toEqual({ values: [], inverse: false, operator: 'gte', operand: 3 });

    const filters = { a: { values: ['x'], inverse: false }, b: { values: [], inverse: true } };
    expect(requestFilters(filters)).toEqual({ a: filters.a });
    expect(requestFilters(null)).toEqual({});
    expect(withFilter(filters, 'a', null)).toEqual({ b: filters.b });
  });

  it('labels a model value from the known list, else by the labels', () => {
    const known = [{ value: 'BE', label: 'Belgium' }];
    expect(selectionFromFilter({ values: ['BE', 'NL'], inverse: false }, undefined, known, DEFAULT_DATATABLE_LABELS).values).toEqual([
      { value: 'BE', label: 'Belgium' },
      { value: 'NL', label: DEFAULT_DATATABLE_LABELS.filterValue('NL') },
    ]);
    expect(selectionFromFilter(undefined, { operator: 'lt' }, known, DEFAULT_DATATABLE_LABELS)).toEqual({ values: [], inverse: false, operator: 'lt', operand: null });
  });
});

describe('datatableCore server seed (#448)', () => {
  const page = { data: [{ id: 1 }], totalRecords: 41 };
  const inputs = (o: Partial<DatatableInputs> = {}) =>
    ({
      columns: COLUMNS,
      fetch: vi.fn(() => Promise.resolve(page)),
      stateKey: 'artists',
      filters: { name: { values: ['Muse'], inverse: false } },
      fetchParams: { search: 'm' },
      sortColumns: [],
      page: 1,
      perPage: 20,
      virtualScroll: false,
      ...o,
    }) as unknown as DatatableInputs;

  it('keys the request canonically: key order and inactive filters never change it', () => {
    const a = inputs({ fetchParams: { x: 1, y: 2 } });
    const b = inputs({ fetchParams: { y: 2, x: 1 }, filters: { name: { values: ['Muse'], inverse: false }, year: { values: [], inverse: false } } });
    expect(datatableCore.transferKey!(a)).toBe(datatableCore.transferKey!(b));
    expect(datatableCore.transferKey!(a)).toMatch(/^mp-dt:artists:/);
    expect(datatableCore.transferKey!(inputs({ fetchParams: { x: 2, y: 2 } }))).not.toBe(datatableCore.transferKey!(a));
  });

  it('names a non-JSON fetchParams', () => {
    expect(() => datatableCore.transferKey!(inputs({ fetchParams: { since: new Date() } as never }))).toThrow(/fetchParams\.since is a Date/);
  });

  it('has nothing to transfer without stateKey or fetch', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(datatableCore.transferKey!(inputs({ stateKey: null }))).toBeUndefined();
    expect(datatableCore.prefetch!(inputs({ stateKey: null }), new AbortController().signal)).toBeUndefined();
    expect(datatableCore.transferKey!(inputs({ fetch: null }))).toBeUndefined();
    warn.mockRestore();
  });

  it('prefetches page 1 with the filters and params, and seeds the state it answers', async () => {
    const i = inputs();
    const signal = new AbortController().signal;
    const seed = await datatableCore.prefetch!(i, signal);
    expect(i.fetch).toHaveBeenCalledWith({
      parentId: null,
      page: 1,
      perPage: 20,
      sortColumns: [],
      filters: { name: { values: ['Muse'], inverse: false } },
      params: { search: 'm' },
      signal,
    });
    const state = datatableCore.state(i, seed);
    expect(state.fetched).toEqual(page.data);
    expect(state.totalRecords).toBe(41);
    expect(state.fetching).toBe(false);
    expect(state.fetchedKey).toBe(requestKeyOf(i, state));
  });

  it('adopts a seed delivered with a late fetch, and only for its own query (#449 review)', async () => {
    const seed = await datatableCore.prefetch!(inputs(), new AbortController().signal);
    const before = datatableCore.state(inputs({ fetch: null }), undefined);
    expect(before.fetched).toBeNull();
    const late = inputs();
    const after = datatableCore.adopt!(before, late, seed);
    expect(after.fetched).toEqual(page.data);
    expect(after.seededFor).toBe(late.fetch);
    expect(after.fetching).toBe(false);
    expect(after.fetchedKey).toBe(requestKeyOf(inputs(), after));
    expect(datatableCore.adopt!(before, inputs({ fetchParams: { search: 'q' } }), seed)).toBe(before);
    expect(datatableCore.adopt!(before, inputs({ fetch: null }), seed)).toBe(before);
  });

  it('keeps an adopted seed only for the fetch it was adopted for, also across a swap before attach (#449 review)', async () => {
    const seed = await datatableCore.prefetch!(inputs(), new AbortController().signal);
    const run = async (swap: boolean) => {
      let current = inputs({ fetch: null });
      let state = datatableCore.state(current, undefined);
      const runtime = coreRuntime(datatableCore, {
        inputs: () => current,
        state: () => state,
        setState: (next) => (state = next),
        emit: () => undefined,
      });
      const report = (next: DatatableInputs) => {
        current = next;
        runtime.inputs(next);
      };
      report(current);
      const late = inputs();
      state = datatableCore.adopt!(state, late, seed);
      report(late);
      const b = inputs();
      if (swap) {
        report({ ...late, fetch: null });
        report(b);
      }
      runtime.attachTo(document.createElement('div'));
      await new Promise((resolve) => setTimeout(resolve, 0));
      return { late, b, state };
    };

    const kept = await run(false);
    expect(kept.late.fetch).not.toHaveBeenCalled();
    expect(kept.state.fetched).toEqual(page.data);

    const swapped = await run(true);
    expect(swapped.late.fetch).not.toHaveBeenCalled();
    expect(swapped.b.fetch).toHaveBeenCalledTimes(1);
  });

  it('ignores a seed for another query, and renders loading instead', async () => {
    const seed = await datatableCore.prefetch!(inputs(), new AbortController().signal);
    const state = datatableCore.state(inputs({ fetchParams: { search: 'q' } }), seed);
    expect(state.fetched).toBeNull();
    expect(state.fetchedKey).toBeNull();
    expect(state.fetching).toBe(true);
  });
});
