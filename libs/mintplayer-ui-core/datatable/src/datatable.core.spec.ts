/**
 * The datatable core's attach: DOM events, fetching, column widths and the
 * filter panels, driven through markup that mirrors datatable.view.vue.
 * (The pure view and the server seed are in datatable.spec.ts.)
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { applyBag, el, hostCore } from '../../_conformance/host-core';
import type { DatatableView, DatatableFilterPanel } from './datatable';
import { datatableCore, type DatatableInputs } from './datatable.core';
import type { DatatableColumnDef } from './types/column-def';

interface Artist {
  id: number;
  name: string;
  year: number;
  children?: number;
}

const ROWS: Artist[] = [
  { id: 1, name: 'Queen', year: 1970 },
  { id: 2, name: 'ABBA', year: 1972 },
  { id: 3, name: 'Muse', year: 1994 },
  { id: 4, name: 'Blur', year: 1988 },
];

const COLUMNS: DatatableColumnDef[] = [
  { name: 'name', label: 'Name', filterable: true },
  { name: 'year', label: 'Year', filterable: true, filterMode: 'comparison', filterInputType: 'number', filterOperators: ['gt', 'lt'] },
];

const base = (o: Partial<DatatableInputs> = {}): DatatableInputs => ({
  columns: COLUMNS,
  data: ROWS,
  fetch: null,
  filters: null,
  filtersReadonly: false,
  fetchParams: null,
  stateKey: null,
  caption: null,
  labels: null,
  inputLabel: 'Artists',
  sortColumns: [],
  page: 1,
  perPage: 20,
  perPageOptions: [2, 20],
  pagination: false,
  autoSort: true,
  selectionMode: 'multiple',
  selectedIds: [],
  cutIds: [],
  focusedRowKey: null,
  rowLabel: null,
  rowKey: null,
  tree: false,
  idKey: null,
  childCountKey: null,
  treeIndent: 1.25,
  expandedIds: [],
  selectionStrategy: 'flat',
  loading: false,
  emptyMessage: 'No data',
  virtualScroll: false,
  itemSize: 40,
  virtualBuffer: 0,
  fill: false,
  resizableColumns: true,
  hrefFor: null,
  distincts: null,
  ...o,
});

type Bag = Parameters<typeof applyBag>[1];
const b = (bag: unknown) => bag as Bag;

function panelBody(open: DatatableFilterPanel): HTMLElement {
  if (open.custom) return el('div', b(open.body));
  const cmp = open.comparison;
  const list = open.list;
  const operator = cmp ? (el('select', b(cmp.operator), ...cmp.operators.map((op) => el('option', b(op.option), op.text))) as HTMLSelectElement) : null;
  if (operator && cmp) operator.value = cmp.operatorValue;
  const operand = cmp ? (el('input', b(cmp.operand)) as HTMLInputElement) : null;
  if (operand && cmp) operand.value = cmp.operandText;
  const search = list ? (el('input', b(list.search)) as HTMLInputElement) : null;
  if (search && list) search.value = list.term;
  return el(
    'div',
    b(open.body),
    el('button', b(open.clear), open.clearText),
    cmp && el('div', b(cmp.wrap), operator, operand),
    search,
    list && el('button', b(list.invert), list.invertText),
    list &&
      el(
        'div',
        b(list.group),
        ...list.options.map((opt) => {
          const input = el('input', b(opt.input)) as HTMLInputElement;
          input.checked = opt.checked;
          return el('label', b(opt.label), input, el('span', null, opt.text));
        }),
      ),
  );
}

/** datatable.view.vue, minus the slots. */
function markup({ view }: { view: DatatableView }, host: HTMLElement): Node[] {
  applyBag(host, b(view.root));
  const thead = el(
    'thead',
    b(view.thead),
    el(
      'tr',
      b(view.headerRow),
      view.chevronHeader && el('th', b(view.chevronHeader)),
      view.checkHeader && el('th', b(view.checkHeader), el('input', b(view.deselectAll))),
      ...view.headers.map((h) =>
        el(
          'th',
          b(h.th),
          h.sortHref
            ? el('a', b({ ...h.sort, href: h.sortHref }), el('span', b(h.text), h.label))
            : h.sortable
              ? el('button', b(h.sort), el('span', b(h.text), h.label))
              : el('span', b(h.plain), el('span', b(h.text), h.label)),
          h.resize && el('span', b(h.resize)),
        ),
      ),
    ),
    view.filterRow &&
      el(
        'tr',
        b(view.filterRow),
        view.filterChevronCell && el('th', b(view.filterChevronCell)),
        view.filterCheckCell && el('th', b(view.filterCheckCell)),
        ...view.filterCells.map((fc) =>
          el(
            'th',
            b(fc.th),
            fc.trigger && el('button', b(fc.trigger), fc.summary && el('span', b(fc.summary), fc.summaryText)),
            fc.panel && el('div', b(fc.panel), fc.body && panelBody(fc.body)),
          ),
        ),
      ),
  );
  const tbody = el(
    'tbody',
    b(view.tbody),
    view.stateCell && el('tr', b(view.stateRow), el('td', b(view.stateCell), view.stateText)),
    view.spacerTop && el('tr', b(view.spacerTop.tr), el('td', b(view.spacerTop.td))),
    ...view.rows.map((r) => {
      const check = r.check ? (el('input', b(r.check)) as HTMLInputElement) : null;
      if (check) check.checked = r.checked;
      return el(
        'tr',
        b(r.tr),
        r.chevronCell && el('td', b(r.chevronCell), r.chevron && el('button', b(r.chevron), r.chevronText)),
        r.checkCell && el('td', b(r.checkCell), check),
        r.placeholder ? el('td', b(r.placeholder), '…') : null,
        ...(r.placeholder ? [] : r.cells.map((c) => el('td', b(c.td), c.text))),
      );
    }),
    view.spacerBottom && el('tr', b(view.spacerBottom.tr), el('td', b(view.spacerBottom.td))),
  );
  const footer =
    view.footer &&
    el(
      'div',
      b(view.footer),
      ...view.pagers.map((p) =>
        el(
          'nav',
          b(p.nav),
          el(
            'ul',
            b(p.list),
            ...p.entries.map((e) =>
              el('li', b(e.item), e.gap ? el('span', b(e.link), e.text) : e.anchor ? el('a', b({ ...e.link, href: e.href }), e.text) : el('button', b(e.link), e.text)),
            ),
          ),
        ),
      ),
    );
  return [
    el('div', b(view.live), view.announcement),
    el('div', b(view.shell), el('div', b(view.scroll), el('table', b(view.table), view.caption ? el('caption', b(view.captionBag), view.caption) : null, thead, tbody)), footer),
    el(
      'div',
      b(view.resizePanel),
      el('div', b(view.resizeSteps), el('button', b(view.narrower), '-'), el('output', b(view.widthOutput), view.widthText), el('button', b(view.wider), '+')),
      el('button', b(view.fit), 'Fit'),
      el('button', b(view.reset), 'Reset'),
    ),
  ];
}

// ── jsdom stand-ins ──────────────────────────────────────────────────────
let frames: FrameRequestCallback[] = [];
const flushFrames = () => {
  const run = () => frames.splice(0).map((cb) => cb(0)).length;
  while (run());
};
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  frames = [];
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb));
  vi.stubGlobal('cancelAnimationFrame', () => undefined);
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ width: 100, height: 36, top: 0, left: 0, right: 100, bottom: 36, x: 0, y: 0, toJSON: () => ({}) } as DOMRect);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

function mount(o: Partial<DatatableInputs> = {}) {
  const h = hostCore(datatableCore, base(o), { models: ['selectedIds', 'page', 'sortColumns', 'perPage', 'expandedIds', 'filters'], id: 'dt', markup });
  h.attach();
  const q = <T extends Element = HTMLElement>(selector: string) => h.host.querySelector<T>(selector)!;
  const qa = <T extends Element = HTMLElement>(selector: string) => [...h.host.querySelectorAll<T>(selector)];
  const row = (key: string) => qa('tbody > tr[data-row-key]').find((tr) => tr.dataset['rowKey'] === key)!;
  const click = (target: Element, init: MouseEventInit = {}) => target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ...init }));
  const key = (target: Element, k: string, init: KeyboardEventInit = {}) =>
    target.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...init }));
  return { ...h, q, qa, row, click, key, refresh: () => h.render() };
}

const pointer = (type: string, clientX: number, o: { pointerId?: number; pointerType?: string; button?: number } = {}) => {
  const ev = new MouseEvent(type, { bubbles: true, cancelable: true, clientX, button: o.button ?? 0 });
  Object.defineProperty(ev, 'pointerId', { value: o.pointerId ?? 1 });
  Object.defineProperty(ev, 'pointerType', { value: o.pointerType ?? 'mouse' });
  return ev;
};

const toggle = (panel: Element, newState: 'open' | 'closed') => {
  const ev = new Event('toggle');
  Object.defineProperty(ev, 'newState', { value: newState });
  panel.dispatchEvent(ev);
};

describe('datatableCore selection', () => {
  it('selects on click, toggles with ctrl, extends with shift, and reports the rows', () => {
    const h = mount();
    h.click(h.row('1').querySelector('td[data-column]')!);
    expect(h.state().selectedIds).toEqual(['1']);
    expect(h.state().focusedKey).toBe('1');
    expect(h.events('rowClick')[0]).toMatchObject({ rowKey: '1', rowIndex: 0 });
    h.click(h.row('3'), { ctrlKey: true });
    expect(h.state().selectedIds).toEqual(['1', '3']);
    h.click(h.row('3'), { metaKey: true });
    expect(h.state().selectedIds).toEqual(['1']);
    h.click(h.row('1'), { shiftKey: true });
    expect(h.state().selectedIds).toEqual(['1', '2', '3']);
    expect(h.events('selectionChanged').at(-1)!.selectedRows).toEqual([ROWS[0], ROWS[1], ROWS[2]]);
    h.click(h.row('2'));
    expect(h.changes('selectedIds').at(-1)).toEqual(['2']);
  });

  it('selects one row in single mode, and nothing in none', () => {
    const h = mount({ selectionMode: 'single' });
    h.click(h.row('2'), { ctrlKey: true });
    h.click(h.row('3'), { shiftKey: true });
    expect(h.state().selectedIds).toEqual(['3']);
    h.setInputs({ selectionMode: 'none' });
    expect(h.state().selectedIds).toEqual([]);
    h.click(h.row('1'));
    expect(h.state().selectedIds).toEqual([]);
    expect(h.events('rowClick')).toHaveLength(3);
  });

  it('opens rows on double click and the context menu, which joins the selection', () => {
    const h = mount();
    h.row('2').dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(h.events('rowDblClick')[0]).toMatchObject({ rowKey: '2' });
    h.row('4').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }));
    expect(h.state().selectedIds).toEqual(['4']);
    h.row('4').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }));
    expect(h.events('rowContextMenu')).toHaveLength(2);
    h.q('thead').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }));
    h.q('thead').dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    h.click(h.q('thead'));
    expect(h.events('rowContextMenu')).toHaveLength(2);
  });

  it('moves, selects and opens rows from the keyboard', () => {
    const h = mount();
    h.row('1').dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    expect(h.state().focusedKey).toBe('1');
    h.refresh();
    h.key(h.row('1'), 'ArrowDown');
    expect(document.activeElement).toBe(h.row('2'));
    h.key(h.row('2'), 'ArrowUp');
    expect(document.activeElement).toBe(h.row('1'));
    h.key(h.row('2'), ' ');
    expect(h.state().selectedIds).toEqual(['2']);
    h.key(h.row('3'), 'Enter', { shiftKey: true });
    expect(h.state().selectedIds).toEqual(['2', '3']);
    h.key(h.row('3'), 'x');
    h.key(h.row('3'), 'Enter', { altKey: true });
    h.key(h.q('thead'), 'Enter');
    expect(h.events('rowClick')).toHaveLength(2);
    h.setInputs({ selectionMode: 'none' });
    h.key(h.row('1'), 'Enter');
    expect(h.events('rowClick')).toHaveLength(2);
  });

  it('selects through the checkbox column, by click and by Space, and deselects all', () => {
    const h = mount({ selectionMode: 'checkbox' });
    h.click(h.row('1').querySelector('[data-dt-check]')!);
    h.click(h.row('2').querySelector('[data-dt-check-cell]')!);
    expect(h.state().selectedIds).toEqual(['1', '2']);
    h.click(h.row('1').querySelector('[data-dt-check]')!);
    expect(h.state().selectedIds).toEqual(['2']);
    h.click(h.row('3'));
    expect(h.state().selectedIds).toEqual(['2']);
    h.key(h.row('4'), ' ');
    h.key(h.row('4'), ' ', { shiftKey: true });
    expect(h.state().selectedIds).toEqual(['2', '4']);
    h.key(h.row('4'), 'Enter');
    expect(h.events('rowClick').map((d) => d.rowKey)).toEqual(['3', '4']);
    h.refresh();
    h.click(h.q('[data-dt-deselect-all]'));
    expect(h.state().selectedIds).toEqual([]);
    h.click(h.q('[data-dt-deselect-all]'));
    expect(h.changes('selectedIds')).toHaveLength(5);
  });

  it('follows the consumer’s selection, expansion, focus and columns', () => {
    const h = mount();
    h.setInputs({ selectedIds: ['3'], expandedIds: [9], focusedRowKey: '2' });
    expect(h.state()).toMatchObject({ selectedIds: ['3'], expandedIds: [9], focusedKey: '2' });
    h.setInputs({ selectedIds: undefined as never, expandedIds: undefined as never, focusedRowKey: undefined as never });
    expect(h.state()).toMatchObject({ selectedIds: [], expandedIds: [], focusedKey: null });
    h.setInputs({ columns: [...COLUMNS], fill: true });
    expect(h.state().measured).toBe(false);
    flushFrames();
    h.dispose();
  });
});

describe('datatableCore sort and paging', () => {
  it('sorts from a header, adding a column with shift, back to page 1', () => {
    const h = mount({ pagination: true, perPage: 2, page: 2 });
    h.click(h.q('[data-dt-sort="name"]'));
    expect(h.state().sortColumns).toEqual([{ property: 'name', direction: 'ascending' }]);
    expect(h.changes('page')).toEqual([1]);
    h.click(h.q('[data-dt-sort="name"]'), { shiftKey: true });
    expect(h.changes('sortColumns')).toHaveLength(2);
    h.setInputs({ sortColumns: [{ property: 'year', direction: 'descending' }] });
    expect(h.state().sortColumns).toEqual([{ property: 'year', direction: 'descending' }]);
    h.setInputs({ sortColumns: undefined as never });
    expect(h.state().sortColumns).toEqual([]);
  });

  it('pages and resizes pages from the footer, clamped', () => {
    const h = mount({ pagination: true, perPage: 2 });
    h.refresh();
    const page2 = h.qa('[data-dt-page]').find((e) => e.dataset['dtPage'] === '2')!;
    h.click(page2);
    expect(h.state().page).toBe(2);
    h.refresh();
    h.click(h.qa('[data-dt-per-page]').find((e) => e.dataset['dtPerPage'] === '20')!);
    expect(h.state()).toMatchObject({ perPage: 20, page: 1 });
    h.refresh();
    h.click(h.qa('[data-dt-per-page]').find((e) => e.dataset['dtPerPage'] === '20')!);
    expect(h.changes('perPage')).toEqual([20]);
  });

  it('follows the consumer’s page and page size', () => {
    const h = mount({ pagination: true, perPage: 2 });
    h.setInputs({ page: 2 });
    expect(h.state().page).toBe(2);
    h.setInputs({ perPage: 1 });
    expect(h.state()).toMatchObject({ perPage: 1, page: 1 });
    h.setInputs({ perPage: 3, page: 3 });
    expect(h.state()).toMatchObject({ perPage: 3, page: 3 });
  });

  it('leaves a modified click on a sort or page link to the browser', () => {
    const hrefFor = () => '?state';
    const h = mount({ pagination: true, perPage: 2, hrefFor: hrefFor as never });
    h.refresh();
    const sort = h.q('a[data-dt-sort]');
    if (sort) {
      h.click(sort, { ctrlKey: true });
      expect(h.state().sortColumns).toEqual([]);
    }
    const link = h.qa('a[data-dt-page]')[0];
    if (link) {
      h.click(link, { ctrlKey: true });
      expect(h.state().page).toBe(1);
    }
  });
});

describe('datatableCore fetch', () => {
  const fetchOf = (total = 4) =>
    vi.fn(async ({ page, perPage, parentId }: { page: number; perPage: number; parentId: unknown }) => ({
      data: parentId != null ? [{ id: Number(parentId) * 10, name: `child of ${parentId}`, year: 2000 }] : ROWS.slice((page - 1) * perPage, page * perPage),
      totalRecords: parentId != null ? 1 : total,
      ...(page === 1 ? { extra: { p: 1 } } : {}),
    }));

  it('loads the page, then reloads once per sort or page change', async () => {
    const fetch = fetchOf();
    const h = mount({ fetch, pagination: true, perPage: 2 });
    await settle();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(h.state()).toMatchObject({ fetching: false, totalRecords: 4 });
    expect(h.state().fetched).toEqual(ROWS.slice(0, 2));
    h.refresh();
    h.click(h.q('[data-dt-sort="name"]'));
    h.setInputs({ sortColumns: h.state().sortColumns });
    await settle();
    expect(fetch).toHaveBeenCalledTimes(2);
    h.call('reload', { resetPage: true });
    h.call('reload');
    await settle();
    expect(fetch).toHaveBeenCalledTimes(3);
    h.setInputs({ fetch: null });
    h.call('reload');
    await settle();
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('reports a failed load, never an aborted one', async () => {
    const fail = vi.fn(async () => {
      throw new Error('down');
    });
    const h = mount({ fetch: fail });
    await settle();
    expect(h.events('loadError')).toEqual([{ error: new Error('down') }]);
    expect(h.state().fetching).toBe(false);
    const aborting = vi.fn(async () => {
      throw Object.assign(new Error('aborted'), { name: 'AbortError' });
    });
    h.setInputs({ fetch: aborting });
    await settle();
    expect(h.events('loadError')).toHaveLength(1);
  });

  it('drops a response that a newer source superseded', async () => {
    let resolve!: (v: unknown) => void;
    const slow = vi.fn(() => new Promise((r) => (resolve = r)));
    const h = mount({ fetch: slow as never });
    await settle();
    const fast = fetchOf();
    h.setInputs({ fetch: fast });
    await settle();
    resolve({ data: [{ id: 99 }], totalRecords: 1 });
    await settle();
    expect(h.state().fetched).toEqual(ROWS);
  });

  it('pulls the pages a virtual table scrolls to', async () => {
    const many = Array.from({ length: 100 }, (_, i) => ({ id: i + 1, name: `Artist ${i + 1}`, year: 1900 + i }));
    const fetch = vi.fn(async ({ page, perPage }: { page: number; perPage: number }) => ({
      data: many.slice((page - 1) * perPage, page * perPage),
      totalRecords: page === 3 ? undefined : 100,
    }));
    const h = mount({ fetch: fetch as never, virtualScroll: true, perPage: 20 });
    const scroll = h.q('.datatable-scroll');
    await settle();
    h.refresh();
    flushFrames();
    scroll.scrollTop = 2000;
    scroll.dispatchEvent(new Event('scroll'));
    flushFrames();
    expect(h.state().scrollTop).toBe(2000);
    await settle();
    expect(fetch.mock.calls.map(([r]) => r.page)).toEqual([1, 3, 4]);
    expect([...h.state().pageCache.keys()]).toEqual([3, 4]);
    expect(h.events('pageLoad').map((d) => d.request.page)).toEqual([1, 3, 4]);
  });

  it('forgets a failed window page so it can be asked again', async () => {
    const fetch = vi.fn(async ({ page }: { page: number }) => {
      if (page > 1) throw new Error('page');
      return { data: ROWS.slice(0, 2), totalRecords: 400 };
    });
    const h = mount({ fetch: fetch as never, virtualScroll: true, perPage: 2 });
    const scroll = h.q('.datatable-scroll');
    await settle();
    h.refresh();
    scroll.scrollTop = 4000;
    scroll.dispatchEvent(new Event('scroll'));
    flushFrames();
    await settle();
    expect(h.events('loadError').length).toBeGreaterThan(0);
  });

  it('loads a tree row’s children when it expands, by click or keyboard', async () => {
    const fetch = fetchOf();
    const rows = ROWS.map((r) => ({ ...r, children: 1 }));
    const tree = vi.fn(async (req: { parentId: unknown; page: number; perPage: number }) =>
      req.parentId == null ? { data: rows, totalRecords: 4 } : fetch(req),
    );
    const h = mount({ fetch: tree as never, tree: true, idKey: 'id', childCountKey: 'children', selectionMode: 'checkbox', selectionStrategy: 'cascading' });
    await settle();
    h.refresh();
    h.click(h.row('1').querySelector('[data-dt-toggle]')!);
    expect(h.events('rowExpand')).toHaveLength(1);
    await settle();
    expect(h.state().childCache.get(1)).toEqual([{ id: 10, name: 'child of 1', year: 2000 }]);
    h.refresh();
    h.click(h.row('1').querySelector('[data-dt-check]')!);
    expect(h.state().selectedIds).toEqual(['1', '10']);
    h.click(h.row('10').querySelector('[data-dt-check]')!);
    expect(h.state().selectedIds).toEqual(['1']);
    h.refresh();
    h.key(h.row('1'), 'ArrowLeft');
    expect(h.events('rowCollapse')).toHaveLength(1);
    h.refresh();
    h.key(h.row('2'), 'ArrowRight');
    expect(h.state().expandedIds).toEqual([2]);
    await settle();
    expect(h.changes('expandedIds')).toEqual([[1], [], [2]]);
  });
});

describe('datatableCore column widths', () => {
  it('measures once, then resizes from the keyboard and the options panel', () => {
    const h = mount();
    flushFrames();
    expect(h.state()).toMatchObject({ measured: true, columnWidths: { name: 100, year: 100 } });
    h.refresh();
    const handle = h.q('.resize-handle[data-dt-resize="name"]');
    handle.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    h.key(handle, 'ArrowRight');
    expect(h.state().columnWidths['name']).toBe(110);
    h.key(handle, 'ArrowLeft');
    expect(h.state().columnWidths['name']).toBe(100);
    h.key(handle, 'Enter');
    expect(h.state().resizeColumn).toBe('name');
    h.refresh();
    h.click(h.qa('[data-dt-step]').find((e) => e.dataset['dtStep'] === '1')!);
    expect(h.state().columnWidths['name']).toBe(110);
    h.key(h.q('.resize-handle[data-dt-resize="year"]'), 'ArrowRight');
    h.click(h.q('[data-dt-reset]'));
    expect(h.state().columnWidths['name']).toBe(100);
    h.key(h.q('.resize-handle[data-dt-resize="year"]'), 'Tab');
  });

  it('fits a column to its widest content', () => {
    const h = mount();
    flushFrames();
    h.refresh();
    h.key(h.q('.resize-handle[data-dt-resize="name"]'), 'Enter');
    Object.defineProperty(Range.prototype, 'getBoundingClientRect', { configurable: true, value: () => ({ width: 150 }) });
    h.click(h.q('[data-dt-fit]'));
    expect(h.state().columnWidths['name']).toBeGreaterThanOrEqual(150);
    delete (Range.prototype as { getBoundingClientRect?: unknown }).getBoundingClientRect;
    h.click(h.q('[data-dt-reset]'));
    flushFrames();
    expect(h.state().tableWidth).toBeNull();
    h.click(h.q('.resize-panel'));
  });

  it('drags a handle past the tap slop, and opens the options on a tap', () => {
    const h = mount();
    flushFrames();
    h.refresh();
    const handle = h.q('.resize-handle[data-dt-resize="year"]');
    handle.dispatchEvent(pointer('pointerdown', 0, { button: 2 }));
    handle.dispatchEvent(pointer('pointerdown', 0));
    expect(handle.classList.contains('active')).toBe(true);
    handle.dispatchEvent(pointer('pointermove', 2));
    handle.dispatchEvent(pointer('pointermove', 30, { pointerId: 9 }));
    expect(h.state().columnWidths['year']).toBe(100);
    handle.dispatchEvent(pointer('pointermove', 30));
    expect(h.state().columnWidths['year']).toBe(130);
    expect(h.state().tableWidth).not.toBeNull();
    handle.dispatchEvent(pointer('pointerup', 30, { pointerId: 9 }));
    handle.dispatchEvent(pointer('pointerup', 30));
    expect(h.state().resizeColumn).toBeNull();
    handle.dispatchEvent(pointer('pointerdown', 0, { pointerType: 'touch' }));
    handle.dispatchEvent(pointer('pointerup', 1));
    expect(h.state().resizeColumn).toBe('year');
    handle.dispatchEvent(pointer('pointermove', 1));
    h.q('thead').dispatchEvent(pointer('pointerdown', 0));
  });

  it('re-fits fitting columns when the scroller narrows', () => {
    const width = vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(400);
    const h = mount();
    flushFrames();
    const scroll = h.q('.datatable-scroll');
    width.mockReturnValue(160);
    scroll.dispatchEvent(new Event('scroll'));
    flushFrames();
    expect(h.state().columnWidths).toEqual({ name: 75, year: 75 });
    scroll.dispatchEvent(new Event('scroll'));
    flushFrames();
    expect(h.state().columnWidths).toEqual({ name: 75, year: 75 });
  });
});

describe('datatableCore filters', () => {
  const panel = (h: ReturnType<typeof mount>, name: string) => h.qa('[data-dt-filter-panel]').find((p) => p.dataset['dtFilterPanel'] === name)!;

  it('lists a values panel from its own rows, and applies, inverts and clears the selection', () => {
    const h = mount();
    toggle(panel(h, 'name'), 'open');
    expect(h.state().filterColumn).toBe('name');
    expect(h.state().filterFromLocal).toBe(true);
    h.refresh();
    flushFrames();
    const box = panel(h, 'name').querySelector<HTMLInputElement>('[data-dt-filter-value]')!;
    box.checked = true;
    box.dispatchEvent(new Event('change', { bubbles: true }));
    expect(h.changes('filters')).toHaveLength(1);
    const value = Object.values(h.state().filters)[0];
    expect(value).toMatchObject({ inverse: false });
    h.refresh();
    h.click(panel(h, 'name').querySelector('[data-dt-filter-invert]')!);
    expect(h.state().filters['name']).toMatchObject({ inverse: true });
    h.refresh();
    const again = panel(h, 'name').querySelector<HTMLInputElement>('[data-dt-filter-value]')!;
    again.checked = false;
    again.dispatchEvent(new Event('change', { bubbles: true }));
    h.refresh();
    h.click(panel(h, 'name').querySelector('[data-dt-filter-clear]')!);
    flushFrames();
    expect(h.state().filters).toEqual({});
    const search = panel(h, 'name').querySelector<HTMLInputElement>('[data-dt-filter-search]')!;
    search.value = 'Q';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    expect(h.state().filterTerm).toBe('Q');
    h.setInputs({ data: ROWS.slice(0, 2) });
    expect(h.state().filterLoaded).not.toBeNull();
    toggle(panel(h, 'name'), 'closed');
    expect(h.state().filterColumn).toBeNull();
    toggle(h.q('thead'), 'open');
  });

  it('asks the distincts source, refining in place and re-querying a truncated list', async () => {
    const distincts = vi.fn(async ({ search }: { search: string }) =>
      search === 'none' ? null : { matching: [{ value: 'Queen', label: 'Queen', count: 1 }], remaining: [], hasMore: search === '' },
    );
    const h = mount({ distincts: distincts as never });
    toggle(panel(h, 'name'), 'open');
    await settle();
    expect(h.state().filterLoaded?.matching).toHaveLength(1);
    expect(h.state().filterFromLocal).toBe(false);
    h.refresh();
    const search = panel(h, 'name').querySelector<HTMLInputElement>('[data-dt-filter-search]')!;
    search.value = 'none';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 250));
    expect(h.state().filterFromLocal).toBe(true);
    const failing = vi.fn(async () => {
      throw new Error('x');
    });
    h.setInputs({ distincts: failing as never });
    toggle(panel(h, 'name'), 'closed');
    toggle(panel(h, 'name'), 'open');
    await settle();
    expect(h.state().filterLoading).toBe(false);
  });

  it('compares with an operator and a typed operand, reloading once typing pauses', async () => {
    const fetch = vi.fn(async () => ({ data: ROWS, totalRecords: 4 }));
    const h = mount({ fetch });
    await settle();
    toggle(panel(h, 'year'), 'open');
    h.refresh();
    flushFrames();
    const operand = panel(h, 'year').querySelector<HTMLInputElement>('[data-dt-filter-operand]')!;
    operand.value = '1980';
    operand.dispatchEvent(new Event('input', { bubbles: true }));
    expect(h.state().filters['year']).toMatchObject({ operator: 'gt', operand: 1980 });
    await settle();
    expect(fetch).toHaveBeenCalledTimes(1);
    await new Promise((r) => setTimeout(r, 350));
    expect(fetch).toHaveBeenCalledTimes(2);
    h.refresh();
    const operator = panel(h, 'year').querySelector<HTMLSelectElement>('[data-dt-filter-operator]')!;
    operator.value = 'lt';
    operator.dispatchEvent(new Event('change', { bubbles: true }));
    expect(h.state().filters['year']).toMatchObject({ operator: 'lt', operand: 1980 });
    h.refresh();
    h.click(panel(h, 'year').querySelector('[data-dt-filter-clear]')!);
    expect(h.state().filters).toEqual({});
    h.setInputs({ filters: { year: { values: [], inverse: false, operator: 'gt', operand: 1 } } as never });
    expect(h.state().filters['year']).toMatchObject({ operand: 1 });
    h.setInputs({ filters: { ...h.inputs().filters } as never });
    h.dispose();
  });

  it('closes the open panel through its commands, ignoring other changes and inputs', () => {
    const h = mount();
    toggle(panel(h, 'name'), 'open');
    h.refresh();
    const hide = vi.fn();
    panel(h, 'name').hidePopover = hide;
    const commands = (h.props().view.filterCells[0].body!.ctx as unknown as { close(): void }).close;
    commands();
    h.q('thead').dispatchEvent(new Event('change', { bubbles: true }));
    h.q('thead').dispatchEvent(new Event('input', { bubbles: true }));
    h.click(h.q('[data-dt-filter="name"]'));
    expect(h.state().filterColumn).toBe('name');
  });
});

/**
 * #465: the core owns the filter state. Ticks survive a close, new data and
 * outside writes; a column's panel body is kept after its first open; an open
 * panel re-queries when the other columns' filters change from outside (and
 * never on its own echo); `filtersReadonly` locks every editing control.
 */
describe('datatableCore filter state (#465)', () => {
  const VALUE_COLUMNS: DatatableColumnDef[] = [
    { name: 'name', label: 'Name', filterable: true },
    { name: 'year', label: 'Year', filterable: true },
    { name: 'country', label: 'Country', filterable: true, filterMode: 'custom' },
    { name: 'id', label: 'Id', filterable: true, filterMode: 'comparison', filterInputType: 'number' },
  ];
  const mountValues = (o: Partial<DatatableInputs> = {}) => mount({ columns: VALUE_COLUMNS, ...o });
  type Harness = ReturnType<typeof mount>;
  const panel = (h: Harness, name: string) => h.qa('[data-dt-filter-panel]').find((p) => p.dataset['dtFilterPanel'] === name)!;
  const cell = (h: Harness, name: string) => h.props().view.filterCells.find((fc) => fc.key === name)!;
  const open = (h: Harness, name: string) => {
    toggle(panel(h, name), 'open');
    h.refresh();
    flushFrames();
  };
  const close = (h: Harness, name: string) => {
    toggle(panel(h, name), 'closed');
    h.refresh();
  };
  const boxes = (h: Harness, name: string) => [...panel(h, name).querySelectorAll<HTMLInputElement>('[data-dt-filter-value]')];
  const labelOf = (box: HTMLInputElement) => box.closest('label')!.textContent!.trim();
  const listed = (h: Harness, name: string) => boxes(h, name).map(labelOf);
  const ticked = (h: Harness, name: string) => boxes(h, name).filter((x) => x.checked).map(labelOf);
  const change = (box: HTMLInputElement, checked: boolean) => {
    box.checked = checked;
    box.dispatchEvent(new Event('change', { bubbles: true }));
  };
  const tick = (h: Harness, name: string, label: string) => {
    change(boxes(h, name).find((x) => labelOf(x) === label)!, true);
    h.refresh();
  };
  const valuesOf = (h: Harness, name: string) => (h.state().filters[name]?.values ?? []) as unknown[];
  const list = (...names: string[]) => ({ matching: names.map((n) => ({ value: n, label: n, count: 1 })), remaining: [], hasMore: false });

  it('T3: keeps the ticked values ticked across close and reopen', () => {
    const h = mountValues();
    open(h, 'name');
    tick(h, 'name', 'Queen');
    tick(h, 'name', 'ABBA');
    close(h, 'name');
    open(h, 'name');
    expect(ticked(h, 'name')).toEqual(['Queen', 'ABBA']);
  });

  it('T4: keeps a ticked value ticked, and listed first, when the rows change under it', () => {
    const h = mountValues();
    open(h, 'name');
    tick(h, 'name', 'Muse');
    h.setInputs({ data: [{ id: 9, name: 'Oasis', year: 1991 }, ...ROWS.filter((r) => r.name !== 'Muse')] });
    h.refresh();
    expect(ticked(h, 'name')).toEqual(['Muse']);
    expect(listed(h, 'name')[0]).toBe('Muse');
    tick(h, 'name', 'Oasis');
    expect(valuesOf(h, 'name')).toEqual(['Muse', 'Oasis']);
  });

  it('T4: keeps a ticked value ticked when the server answers with a different list on reopen', async () => {
    const answers = [list('ABBA', 'Blur', 'Muse', 'Queen'), list('Queen', 'Oasis', 'Blur')];
    const distincts = vi.fn(async () => answers.shift() ?? list());
    const h = mountValues({ distincts: distincts as never });
    open(h, 'name');
    await settle();
    h.refresh();
    tick(h, 'name', 'Muse');
    close(h, 'name');
    open(h, 'name');
    await settle();
    h.refresh();
    expect(ticked(h, 'name')).toEqual(['Muse']);
    expect(listed(h, 'name')[0]).toBe('Muse');
    tick(h, 'name', 'Blur');
    expect(valuesOf(h, 'name')).toEqual(['Muse', 'Blur']);
  });

  it('T5: a click on an option resolves its own value, even when the list moved on before the render', () => {
    const h = mountValues();
    open(h, 'name');
    const muse = boxes(h, 'name').find((x) => labelOf(x) === 'Muse')!;
    // The list changes (new rows) but the DOM has not re-rendered yet: the click lands on the stale node.
    h.setInputs({ data: [{ id: 7, name: 'Air', year: 1995 }, { id: 8, name: 'Beck', year: 1993 }, ...ROWS] });
    change(muse, true);
    expect(valuesOf(h, 'name')).toEqual(['Muse']);
  });

  it('T5: option keys are the value, not the position', () => {
    const h = mountValues();
    open(h, 'name');
    const before = Object.fromEntries(boxes(h, 'name').map((x) => [labelOf(x), x.getAttribute('data-dt-filter-value')]));
    h.setInputs({ data: [{ id: 7, name: 'Air', year: 1995 }, ...ROWS] });
    h.refresh();
    const after = Object.fromEntries(boxes(h, 'name').map((x) => [labelOf(x), x.getAttribute('data-dt-filter-value')]));
    expect(after['Queen']).toBe(before['Queen']);
    expect(after['Muse']).toBe(before['Muse']);
    expect(new Set(Object.values(after)).size).toBe(Object.keys(after).length);
  });

  it('T6: filters written from outside while closed show ticked on open, custom ctx included', () => {
    const h = mountValues();
    h.setInputs({ filters: { name: { values: ['Muse', 'Nirvana'], inverse: false }, country: { values: ['BE'], inverse: true } } as never });
    open(h, 'name');
    expect(ticked(h, 'name')).toEqual(['Muse', 'Nirvana']);
    close(h, 'name');
    open(h, 'country');
    const ctx = cell(h, 'country').body!.ctx;
    expect(ctx.selection.values.map((v) => v.value)).toEqual(['BE']);
    expect(ctx.selection.inverse).toBe(true);
    expect(h.changes('filters')).toHaveLength(0);
  });

  it('T7: filters written from outside while open update the ticks in place', () => {
    const h = mountValues();
    open(h, 'name');
    tick(h, 'name', 'Queen');
    h.setInputs({ filters: { name: { values: ['Blur'], inverse: false } } as never });
    h.refresh();
    expect(ticked(h, 'name')).toEqual(['Blur']);
    expect(h.state().filterColumn).toBe('name');
  });

  it('T2/T11: keeps an opened column’s body, with a closed-panel ctx, and builds none for unopened columns', async () => {
    const answers = [list('NL', 'BE'), list('FR', 'BE', 'DE')];
    const distincts = vi.fn(async () => answers.shift() ?? list());
    const h = mountValues({ distincts: distincts as never });
    expect(cell(h, 'country').body).toBeNull();
    expect(cell(h, 'name').body).toBeNull();
    open(h, 'country');
    await settle();
    const first = cell(h, 'country').body!;
    expect(first.custom).toBe(true);
    first.ctx.search('B');
    first.ctx.apply([{ value: 'BE', label: 'BE' }], false);
    close(h, 'country');
    const closed = cell(h, 'country').body!;
    expect(closed).not.toBeNull();
    expect(closed.ctx).toMatchObject({ values: null, loading: false, term: '' });
    expect(closed.ctx.selection.values.map((v) => v.value)).toEqual(['BE']);
    expect(cell(h, 'name').body).toBeNull();
    open(h, 'country');
    await settle();
    const again = cell(h, 'country').body!.ctx;
    expect(again.term).toBe('');
    // D7b: the snapshot taken at the first apply is the universe, so its values keep their place
    // and the source's new ones follow; NL is no longer present and is not listed as matching.
    expect(again.values?.matching.map((v) => v.value)).toEqual(['BE', 'FR', 'DE']);
    expect(again.selection.values.map((v) => v.value)).toEqual(['BE']);
    expect(distincts).toHaveBeenCalledTimes(2);
  });

  it('T11: drops a kept body when its column stops being filterable, changes mode or leaves the columns', () => {
    const h = mountValues();
    open(h, 'name');
    close(h, 'name');
    open(h, 'year');
    close(h, 'year');
    expect(cell(h, 'name').body).not.toBeNull();
    expect(cell(h, 'year').body).not.toBeNull();
    h.setInputs({
      columns: [
        { ...VALUE_COLUMNS[0], filterable: false },
        { ...VALUE_COLUMNS[1], filterMode: 'comparison' },
        VALUE_COLUMNS[2],
      ],
    });
    h.refresh();
    expect(cell(h, 'name').body).toBeNull();
    expect(cell(h, 'year').body).toBeNull();
    expect(h.state().filterMounted).toEqual([]);
    h.setInputs({ columns: VALUE_COLUMNS });
    h.refresh();
    expect(cell(h, 'name').body).toBeNull();
  });

  it('T8a: an open panel re-queries once when another column’s filter changes from outside, never for its own', async () => {
    const distincts = vi.fn(async () => list('Queen', 'ABBA'));
    const h = mountValues({ distincts: distincts as never });
    open(h, 'name');
    await settle();
    expect(distincts).toHaveBeenCalledTimes(1);
    h.setInputs({ filters: { year: { values: [1970], inverse: false } } as never });
    await settle();
    expect(distincts).toHaveBeenCalledTimes(2);
    expect((distincts.mock.calls[1] as unknown[])[0]).toMatchObject({ column: 'name', filters: { year: { values: [1970], inverse: false } } });
    // The same filters again, as a new object: nothing changed, nothing is asked.
    h.setInputs({ filters: { year: { values: [1970], inverse: false } } as never });
    await settle();
    // Only the open column's own filter changes: the facet ignores it.
    h.setInputs({ filters: { year: { values: [1970], inverse: false }, name: { values: ['Queen'], inverse: false } } as never });
    await settle();
    expect(distincts).toHaveBeenCalledTimes(2);
    expect(h.changes('filters')).toHaveLength(0);
  });

  it('T8b: the echo of its own filters change re-queries nothing and reports nothing twice', async () => {
    const distincts = vi.fn(async () => list('Queen', 'ABBA'));
    const h = mountValues({ distincts: distincts as never });
    open(h, 'name');
    await settle();
    h.refresh();
    tick(h, 'name', 'Queen');
    expect(h.changes('filters')).toHaveLength(1);
    // A two-way binding hands the reported value straight back.
    h.setInputs({ filters: structuredClone(h.changes('filters').at(-1)) as never });
    await settle();
    h.refresh();
    expect(distincts).toHaveBeenCalledTimes(1);
    expect(h.changes('filters')).toHaveLength(1);
    expect(ticked(h, 'name')).toEqual(['Queen']);
  });

  it('T9: filtersReadonly shows the applied filters, locks every editing control and still takes programmatic filters', () => {
    const h = mountValues({ filtersReadonly: true, filters: { name: { values: ['Queen'], inverse: false } } as never });
    open(h, 'name');
    expect(ticked(h, 'name')).toEqual(['Queen']);
    expect(boxes(h, 'name').every((x) => x.disabled)).toBe(true);
    const p = panel(h, 'name');
    expect(p.querySelector<HTMLButtonElement>('[data-dt-filter-invert]')!.disabled).toBe(true);
    expect(p.querySelector<HTMLButtonElement>('[data-dt-filter-clear]')!.disabled).toBe(true);
    expect(p.querySelector<HTMLInputElement>('[data-dt-filter-search]')!.disabled).toBe(false);
    change(boxes(h, 'name').find((x) => labelOf(x) === 'ABBA')!, true);
    h.click(p.querySelector('[data-dt-filter-invert]')!);
    expect(h.changes('filters')).toHaveLength(0);
    close(h, 'name');
    open(h, 'id');
    const operand = panel(h, 'id').querySelector<HTMLInputElement>('[data-dt-filter-operand]')!;
    expect(operand.disabled).toBe(true);
    expect(panel(h, 'id').querySelector<HTMLSelectElement>('[data-dt-filter-operator]')!.disabled).toBe(true);
    close(h, 'id');
    open(h, 'country');
    const ctx = cell(h, 'country').body!.ctx;
    expect(ctx.readonly).toBe(true);
    ctx.apply([{ value: 'BE', label: 'BE' }], false);
    ctx.compare('gt', '1');
    ctx.clear();
    expect(h.changes('filters')).toHaveLength(0);
    expect(h.state().filters).toEqual({ name: { values: ['Queen'], inverse: false } });
    // Programmatic writes still land (the table never filters rows itself: `fetch` or the consumer does).
    h.setInputs({ filters: { name: { values: ['Muse'], inverse: false } } as never });
    h.refresh();
    expect(h.state().filters).toEqual({ name: { values: ['Muse'], inverse: false } });
    close(h, 'country');
    open(h, 'name');
    expect(ticked(h, 'name')).toEqual(['Muse']);
  });
});
