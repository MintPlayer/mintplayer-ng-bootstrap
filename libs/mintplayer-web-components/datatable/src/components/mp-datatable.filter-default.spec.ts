import { beforeEach, describe, expect, it, vi } from 'vitest';
import './mp-datatable';
import type { MpDatatable } from './mp-datatable';
import type {
  DatatableColumnDef,
  DatatableDistincts,
  DistinctValues,
  FilterChangeDetail,
  FilterContext,
} from '../types';

const DATA = [
  { id: 1, name: 'Ada', country: 'UK' },
  { id: 2, name: 'Grace', country: 'US' },
  { id: 3, name: 'Alan', country: 'UK' },
];

async function settle(el: MpDatatable) {
  await el.updateComplete;
  await new Promise((r) => setTimeout(r, 0));
  await el.updateComplete;
}

async function mount(cols: DatatableColumnDef[], data: unknown[] = DATA) {
  document.body.innerHTML = '<mp-datatable></mp-datatable>';
  const el = document.querySelector('mp-datatable') as MpDatatable;
  (el as unknown as { columns: DatatableColumnDef[] }).columns = cols;
  (el as unknown as { data: unknown[] }).data = data;
  await settle(el);
  return el;
}

const FILTERABLE: DatatableColumnDef[] = [
  { name: 'name', label: 'Name' },
  { name: 'country', label: 'Country', filterable: true },
];

const trigger = (el: MpDatatable, column = 'country') =>
  (el.renderRoot as unknown as ParentNode).querySelector<HTMLButtonElement>(
    `tr.filter-row th[data-column="${column}"] .filter-trigger`,
  );
const pane = () => document.querySelector('.mp-overlay-pane');
const panelQuery = <T extends Element>(selector: string) =>
  document.querySelector<T>(`.mp-overlay-pane ${selector}`);
const panelQueryAll = (selector: string) => [...document.querySelectorAll(`.mp-overlay-pane ${selector}`)];
const options = () => panelQueryAll('.filter-option');
const optionLabels = () => options().map((o) => o.querySelector('span')?.textContent ?? '');

async function open(el: MpDatatable, column = 'country') {
  trigger(el, column)!.click();
  await settle(el);
}

describe('mp-datatable built-in filter panel', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('renders when the column has no filterRenderer', async () => {
    const el = await mount(FILTERABLE);
    await open(el);

    expect(panelQuery('.filter-search')).toBeTruthy();
    expect(panelQuery('.filter-clear')).toBeTruthy();
    expect(panelQuery('.filter-invert')).toBeTruthy();
    expect(panelQuery('.filter-options')?.getAttribute('role')).toBe('group');
  });

  /**
   * `null` is how a framework wrapper says "this column declared no override".
   * It cannot decide that up front — the Angular directive supplying the
   * template has not been constructed when the column defs are built.
   */
  it('renders when filterRenderer returns null', async () => {
    const el = await mount([
      FILTERABLE[0],
      { ...FILTERABLE[1], filterRenderer: () => null },
    ]);
    await open(el);

    expect(panelQuery('.filter-search')).toBeTruthy();
  });

  it('yields to a filterRenderer that returns a node', async () => {
    const node = document.createElement('div');
    node.className = 'consumer-panel';
    const el = await mount([FILTERABLE[0], { ...FILTERABLE[1], filterRenderer: () => node }]);
    await open(el);

    expect(panelQuery('.consumer-panel')).toBeTruthy();
    expect(panelQuery('.filter-search')).toBeNull();
  });

  it('lists the column’s distinct values, computed locally', async () => {
    const el = await mount(FILTERABLE);
    await open(el);

    expect(optionLabels().sort()).toEqual(['UK', 'US']);
  });

  it('marks the panel aria-modal and focuses the search box on open', async () => {
    const el = await mount(FILTERABLE);
    await open(el);

    expect(panelQuery('.filter-panel')?.getAttribute('aria-modal')).toBe('true');
    expect(document.activeElement).toBe(panelQuery('.filter-search'));
  });

  it('emits the selection on check and on uncheck', async () => {
    const el = await mount(FILTERABLE);
    const seen: FilterChangeDetail[] = [];
    el.addEventListener('mp-datatable-filter-change', (e) =>
      seen.push((e as CustomEvent<FilterChangeDetail>).detail),
    );
    await open(el);

    const first = options()[0].querySelector('input') as HTMLInputElement;
    first.click();
    await settle(el);
    expect(seen.at(-1)).toMatchObject({ column: 'country', inverse: false });
    expect(seen.at(-1)!.selected.length).toBe(1);

    first.click();
    await settle(el);
    expect(seen.at(-1)!.selected.length).toBe(0);
  });

  it('toggles aria-pressed on the invert button and reports it', async () => {
    const el = await mount(FILTERABLE);
    const seen: FilterChangeDetail[] = [];
    el.addEventListener('mp-datatable-filter-change', (e) =>
      seen.push((e as CustomEvent<FilterChangeDetail>).detail),
    );
    await open(el);

    const invert = panelQuery<HTMLButtonElement>('.filter-invert')!;
    expect(invert.getAttribute('aria-pressed')).toBe('false');

    invert.click();
    await settle(el);
    expect(panelQuery('.filter-invert')?.getAttribute('aria-pressed')).toBe('true');
    expect(seen.at(-1)!.inverse).toBe(true);
  });

  it('disables Clear until something is selected, then clears and refocuses search', async () => {
    const el = await mount(FILTERABLE);
    const seen: FilterChangeDetail[] = [];
    el.addEventListener('mp-datatable-filter-change', (e) =>
      seen.push((e as CustomEvent<FilterChangeDetail>).detail),
    );
    await open(el);

    expect(panelQuery<HTMLButtonElement>('.filter-clear')!.disabled).toBe(true);

    options()[0].querySelector('input')!.click();
    await settle(el);
    expect(panelQuery<HTMLButtonElement>('.filter-clear')!.disabled).toBe(false);

    panelQuery<HTMLButtonElement>('.filter-clear')!.click();
    await settle(el);

    expect(seen.at(-1)).toMatchObject({ selected: [], inverse: false });
    // Clear disables itself, so focus must go somewhere deliberate.
    expect(document.activeElement).toBe(panelQuery('.filter-search'));
  });

  /**
   * The focus regression that shipped in Revision 1 and must not return: a
   * panel rebuilt on every render destroys the input the user is typing into.
   */
  it('keeps focus and caret in the search box while typing', async () => {
    const el = await mount(FILTERABLE);
    await open(el);

    const search = panelQuery<HTMLInputElement>('.filter-search')!;
    search.focus();
    search.value = 'U';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    await settle(el);

    expect(document.activeElement).toBe(panelQuery('.filter-search'));
    expect(panelQuery<HTMLInputElement>('.filter-search')).toBe(search);
  });

  it('narrows the list as the search term is typed, and restores it when cleared', async () => {
    const el = await mount(FILTERABLE);
    await open(el);

    const search = panelQuery<HTMLInputElement>('.filter-search')!;
    search.value = 'uk';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    await settle(el);
    expect(optionLabels()).toEqual(['UK']);

    // Restored without a round trip: the loaded list is never narrowed in place.
    search.value = '';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    await settle(el);
    expect(optionLabels().sort()).toEqual(['UK', 'US']);
  });

  /**
   * Without the snapshot, selecting a value narrows the data, which narrows the
   * list, which removes every other value — so a filter could only ever be
   * narrowed, never widened, without clearing it first.
   */
  it('keeps unselected values listed after the data shrinks to the selection', async () => {
    const el = await mount(FILTERABLE);
    await open(el);

    options().find((o) => o.textContent?.includes('UK'))!.querySelector('input')!.click();
    await settle(el);

    // The consumer applies the filter by rebinding `data` to the subset.
    (el as unknown as { data: unknown[] }).data = DATA.filter((r) => r.country === 'UK');
    await settle(el);

    expect(optionLabels().sort()).toEqual(['UK', 'US']);
    // The value that left the data is dimmed, not dropped.
    expect(panelQueryAll('.filter-remaining').length).toBe(1);
  });

  it('renders null, empty string and booleans through the label functions', async () => {
    const el = await mount([{ name: 'flag', label: 'Flag', filterable: true }], [
      { flag: null },
      { flag: '' },
      { flag: true },
      { flag: false },
    ]);
    await open(el, 'flag');

    expect(optionLabels().sort()).toEqual(['(empty)', '(none)', 'No', 'Yes']);
  });

  it('routes those strings through a consumer label override', async () => {
    const el = await mount([{ name: 'flag', label: 'Flag', filterable: true }], [{ flag: null }]);
    (el as unknown as { labels: unknown }).labels = { filterNone: 'geen' };
    await settle(el);
    await open(el, 'flag');

    // The default `filterValue` reads `filterNone` off the MERGED label set, so
    // translating one key is enough — it does not close over the defaults.
    expect(optionLabels()).toEqual(['geen']);
  });

  it('covers every row, not just the visible page', async () => {
    const rows = Array.from({ length: 40 }, (_, i) => ({ country: `C${i % 7}` }));
    const el = await mount([{ name: 'country', label: 'Country', filterable: true }], rows);
    (el as unknown as { pagination: boolean }).pagination = true;
    (el as unknown as { perPage: number }).perPage = 5;
    await settle(el);
    await open(el);

    expect(options().length).toBe(7);
  });

  it('reports no values when it holds only a window of the data', async () => {
    const el = await mount(FILTERABLE);
    (el as unknown as { fetch: unknown }).fetch = () =>
      Promise.resolve({ data: DATA, totalRecords: 999 });
    await settle(el);
    await open(el);

    expect(options().length).toBe(0);
    expect(panelQuery('.filter-no-values')).toBeTruthy();
  });

  /**
   * `set fetch(null)` reset nothing before this work, so `isExternallyPaged()`
   * stayed true forever and the local path could never run again.
   */
  it('recovers the local list when fetch is cleared', async () => {
    const el = await mount(FILTERABLE);
    (el as unknown as { fetch: unknown }).fetch = () =>
      Promise.resolve({ data: DATA, totalRecords: 999 });
    await settle(el);

    (el as unknown as { fetch: unknown }).fetch = null;
    (el as unknown as { data: unknown[] }).data = DATA;
    await settle(el);

    expect(el.totalRecords).toBeNull();
    await open(el);
    expect(optionLabels().sort()).toEqual(['UK', 'US']);
  });

  it('asks the distincts source before computing locally', async () => {
    const source = vi.fn<DatatableDistincts>(async () => ({
      matching: [{ value: 'ZZ', label: 'Zanzibar' }],
      remaining: [],
      hasMore: false,
    }));
    const el = await mount(FILTERABLE);
    (el as unknown as { distincts: DatatableDistincts }).distincts = source;
    await settle(el);
    await open(el);

    expect(source).toHaveBeenCalledWith(expect.objectContaining({ column: 'country', search: '' }));
    expect(optionLabels()).toEqual(['Zanzibar']);
  });

  it('falls back to the local list for a column the source resolves null for', async () => {
    const el = await mount(FILTERABLE);
    (el as unknown as { distincts: DatatableDistincts }).distincts = async () => null;
    await settle(el);
    await open(el);

    expect(optionLabels().sort()).toEqual(['UK', 'US']);
  });

  it('shows the truncation notice when the source reports hasMore', async () => {
    const el = await mount(FILTERABLE);
    (el as unknown as { distincts: DatatableDistincts }).distincts = async () => ({
      matching: [{ value: 'UK', label: 'UK' }],
      remaining: [],
      hasMore: true,
    });
    await settle(el);
    await open(el);

    expect(panelQuery('.filter-has-more')).toBeTruthy();
  });

  /**
   * A re-query is only worth a round trip when the loaded list cannot answer:
   * either it was truncated, or the term is not a refinement of the loaded one.
   */
  it('re-queries the source only when the loaded list cannot answer', async () => {
    // Truncated on the first call only, so the panel starts out unable to
    // answer and then becomes able to — both rules are exercised in one run.
    const source = vi.fn<DatatableDistincts>(async ({ search }) => ({
      matching: [{ value: 'UK', label: 'UK' }],
      remaining: [],
      hasMore: search === '',
    }));
    const el = await mount(FILTERABLE);
    (el as unknown as { distincts: DatatableDistincts }).distincts = source;
    await settle(el);
    await open(el);
    expect(source).toHaveBeenCalledTimes(1);

    const search = panelQuery<HTMLInputElement>('.filter-search')!;
    const type = async (value: string) => {
      search.value = value;
      search.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 300));
      await settle(el);
    };

    // The loaded list was truncated, so it cannot answer for a narrower term.
    await type('U');
    expect(source).toHaveBeenCalledTimes(2);

    // 'UK' refines 'U', and the list loaded for 'U' is complete: no round trip.
    await type('UK');
    expect(source).toHaveBeenCalledTimes(2);

    // Clearing WIDENS past 'U', so the loaded list may be missing values.
    await type('');
    expect(source).toHaveBeenCalledTimes(3);
  });

  it('hands a working context to a consumer renderer', async () => {
    let captured: FilterContext | undefined;
    const node = document.createElement('div');
    const el = await mount([
      FILTERABLE[0],
      {
        ...FILTERABLE[1],
        filterRenderer: (_col, ctx) => {
          captured = ctx;
          return node;
        },
      },
    ]);
    await open(el);

    expect(captured).toBeTruthy();
    const values = captured!.values() as DistinctValues;
    expect(values.matching.map((v) => v.label).sort()).toEqual(['UK', 'US']);

    const seen: FilterChangeDetail[] = [];
    el.addEventListener('mp-datatable-filter-change', (e) =>
      seen.push((e as CustomEvent<FilterChangeDetail>).detail),
    );
    captured!.apply([{ value: 'UK', label: 'UK' }], true);
    await settle(el);
    expect(seen.at(-1)).toMatchObject({ column: 'country', inverse: true });
  });

  it('notifies a consumer renderer through onChange', async () => {
    let captured: FilterContext | undefined;
    const node = document.createElement('div');
    const el = await mount([
      FILTERABLE[0],
      { ...FILTERABLE[1], filterRenderer: (_col, ctx) => ((captured = ctx), node) },
    ]);
    await open(el);

    const changes = vi.fn();
    const unsubscribe = captured!.onChange(changes);
    captured!.apply([{ value: 'UK', label: 'UK' }], false);
    await settle(el);
    expect(changes).toHaveBeenCalled();

    unsubscribe();
    changes.mockClear();
    captured!.clear();
    await settle(el);
    expect(changes).not.toHaveBeenCalled();
  });

  it('seeds the selection from filterSelection on the column def', async () => {
    const el = await mount([
      FILTERABLE[0],
      {
        ...FILTERABLE[1],
        filterSelection: { values: [{ value: 'UK', label: 'UK' }], inverse: true },
      },
    ]);
    await open(el);

    expect(panelQuery<HTMLButtonElement>('.filter-clear')!.disabled).toBe(false);
    expect(panelQuery('.filter-invert')?.getAttribute('aria-pressed')).toBe('true');
    const checked = options().filter((o) => o.querySelector<HTMLInputElement>('input')!.checked);
    expect(checked.map((o) => o.textContent?.trim())).toEqual(['UK']);
  });

  it('keeps the selection across an unrelated columns reassignment', async () => {
    const el = await mount(FILTERABLE);
    await open(el);
    options()[0].querySelector('input')!.click();
    await settle(el);

    // The Angular wrapper rebuilds the whole array on any input change.
    (el as unknown as { columns: DatatableColumnDef[] }).columns = FILTERABLE.map((c) => ({ ...c }));
    await settle(el);

    expect(panelQuery<HTMLButtonElement>('.filter-clear')!.disabled).toBe(false);
  });

  it('drops the panel and its state when the column goes away', async () => {
    const el = await mount(FILTERABLE);
    await open(el);
    expect(pane()).toBeTruthy();

    (el as unknown as { columns: DatatableColumnDef[] }).columns = [FILTERABLE[0]];
    await settle(el);

    expect(trigger(el)).toBeNull();
  });
});
