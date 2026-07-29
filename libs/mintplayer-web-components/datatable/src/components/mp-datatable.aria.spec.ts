import { beforeEach, describe, expect, it } from 'vitest';
import './mp-datatable';
import type { MpDatatable } from './mp-datatable';

/**
 * ARIA *state* for `<mp-datatable>` — the half neither sibling spec covers.
 *
 * `mp-datatable.keyboard.spec.ts` asserts the role switch and the first step of
 * each state (aria-sort ascending, aria-selected true, aria-busy true); the
 * naming contract in `_conformance/naming.spec.ts` owns the name channel. What
 * is asserted here is every state's RETURN path plus the states no spec touches
 * at all: the sort cycle to "none", aria-busy clearing, aria-selected
 * disappearing with the selection mode, aria-expanded / aria-level on tree
 * rows, aria-rowindex / aria-rowcount arithmetic, the resize handle's
 * aria-valuenow, and the live-region text each action produces.
 *
 * Every transition is driven at least once by a PROGRAMMATIC property write —
 * a state written only from an event handler is stale for the setter path, and
 * that is the exact defect class this phase exists to close.
 */
interface Row { id: number; name: string; age?: number; childCount?: number; }

const DATA: Row[] = [
  { id: 1, name: 'Alpha', age: 30 },
  { id: 2, name: 'Beta', age: 20 },
  { id: 3, name: 'Gamma', age: 40 },
];

const COLUMNS = [
  { name: 'name', label: 'Name' },
  { name: 'age', label: 'Age' },
];

async function mount(attrs = '', data: Row[] = DATA): Promise<MpDatatable> {
  document.body.innerHTML = `<mp-datatable ${attrs}></mp-datatable>`;
  const el = document.querySelector('mp-datatable') as MpDatatable;
  (el as unknown as { columns: unknown }).columns = COLUMNS;
  (el as unknown as { data: unknown }).data = data;
  await settle(el);
  return el;
}

async function settle(el: MpDatatable): Promise<void> {
  await el.updateComplete;
  await new Promise((resolve) => setTimeout(resolve, 0));
  await el.updateComplete;
}

const shadow = (el: MpDatatable) => el.shadowRoot!;
const table = (el: MpDatatable) => shadow(el).querySelector('table')!;
const th = (el: MpDatatable, column: string) =>
  shadow(el).querySelector(`th[data-column="${column}"]`)!;
const bodyRows = (el: MpDatatable) =>
  Array.from(shadow(el).querySelectorAll<HTMLTableRowElement>('tbody tr[data-row-key]'));
const liveText = (el: MpDatatable) =>
  shadow(el).querySelector('[role="status"]')?.textContent ?? '';

function clickHeader(el: MpDatatable, column: string, init: MouseEventInit = {}): void {
  const button = th(el, column).querySelector<HTMLButtonElement>('button.header-sort')!;
  button.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true, ...init }));
}

function clickRow(el: MpDatatable, index: number, init: MouseEventInit = {}): void {
  bodyRows(el)[index].dispatchEvent(
    new MouseEvent('click', { bubbles: true, composed: true, ...init }),
  );
}

function pressKey(target: HTMLElement, key: string): void {
  target.dispatchEvent(
    new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, composed: true }),
  );
}

describe('mp-datatable aria-sort cycle', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('marks unsorted columns "none", moves the mark between columns, and toggles direction in place', async () => {
    const el = await mount();
    expect(th(el, 'name').getAttribute('aria-sort')).toBe('none');
    expect(th(el, 'age').getAttribute('aria-sort')).toBe('none');

    clickHeader(el, 'age');
    await el.updateComplete;
    expect(th(el, 'age').getAttribute('aria-sort')).toBe('ascending');
    expect(th(el, 'name').getAttribute('aria-sort')).toBe('none');

    clickHeader(el, 'age');
    await el.updateComplete;
    expect(th(el, 'age').getAttribute('aria-sort')).toBe('descending');
  });

  it('shift-click cycles all the way back to "none" (sorting removed)', async () => {
    const el = await mount();
    clickHeader(el, 'name', { shiftKey: true });
    await el.updateComplete;
    expect(th(el, 'name').getAttribute('aria-sort')).toBe('ascending');

    clickHeader(el, 'name', { shiftKey: true });
    await el.updateComplete;
    expect(th(el, 'name').getAttribute('aria-sort')).toBe('descending');

    clickHeader(el, 'name', { shiftKey: true });
    await el.updateComplete;
    expect(th(el, 'name').getAttribute('aria-sort')).toBe('none');
  });

  it('follows a PROGRAMMATIC sortColumns write, including multi-column sorts', async () => {
    const el = await mount();
    (el as unknown as { sortColumns: unknown }).sortColumns = [
      { property: 'age', direction: 'descending' },
      { property: 'name', direction: 'ascending' },
    ];
    await el.updateComplete;
    expect(th(el, 'age').getAttribute('aria-sort')).toBe('descending');
    expect(th(el, 'name').getAttribute('aria-sort')).toBe('ascending');

    (el as unknown as { sortColumns: unknown }).sortColumns = [];
    await el.updateComplete;
    expect(th(el, 'age').getAttribute('aria-sort')).toBe('none');
    expect(th(el, 'name').getAttribute('aria-sort')).toBe('none');
  });
});

describe('mp-datatable aria-busy', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('clears aria-busy again when loading finishes (not only sets it)', async () => {
    const el = await mount();
    expect(table(el).hasAttribute('aria-busy')).toBe(false);

    (el as unknown as { loading: boolean }).loading = true;
    await el.updateComplete;
    expect(table(el).getAttribute('aria-busy')).toBe('true');

    (el as unknown as { loading: boolean }).loading = false;
    await el.updateComplete;
    expect(table(el).hasAttribute('aria-busy')).toBe(false);
  });
});

describe('mp-datatable aria-selected', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('returns to "false" when the row is toggled back off, and tracks a PROGRAMMATIC selectedIds write both ways', async () => {
    const el = await mount('selection-mode="multiple"');
    clickRow(el, 0, { ctrlKey: true });
    await el.updateComplete;
    expect(bodyRows(el)[0].getAttribute('aria-selected')).toBe('true');

    clickRow(el, 0, { ctrlKey: true });
    await el.updateComplete;
    expect(bodyRows(el)[0].getAttribute('aria-selected')).toBe('false');

    (el as unknown as { selectedIds: unknown }).selectedIds = ['2', '3'];
    await el.updateComplete;
    expect(bodyRows(el).map((r) => r.getAttribute('aria-selected')))
      .toEqual(['false', 'true', 'true']);

    (el as unknown as { selectedIds: unknown }).selectedIds = [];
    await el.updateComplete;
    expect(bodyRows(el).every((r) => r.getAttribute('aria-selected') === 'false')).toBe(true);
  });

  it('drops aria-selected entirely when selection is switched off — rows stop claiming selectability', async () => {
    const el = await mount('selection-mode="multiple"');
    expect(bodyRows(el).every((r) => r.hasAttribute('aria-selected'))).toBe(true);

    (el as unknown as { selectionMode: string }).selectionMode = 'none';
    await el.updateComplete;
    expect(bodyRows(el).some((r) => r.hasAttribute('aria-selected'))).toBe(false);
  });
});

describe('mp-datatable row indices and counts', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('numbers the header row 1 and body rows from 2', async () => {
    const el = await mount();
    expect(shadow(el).querySelector('thead tr')!.getAttribute('aria-rowindex')).toBe('1');
    expect(bodyRows(el).map((r) => r.getAttribute('aria-rowindex'))).toEqual(['2', '3', '4']);
  });

  it('continues aria-rowindex across pages instead of restarting at 2', async () => {
    const el = await mount('pagination');
    (el as unknown as { perPage: number }).perPage = 2;
    await settle(el);
    expect(bodyRows(el).map((r) => r.getAttribute('aria-rowindex'))).toEqual(['2', '3']);

    (el as unknown as { page: number }).page = 2;
    await settle(el);
    // Third record overall → index 4 (header is 1), not 2.
    expect(bodyRows(el).map((r) => r.getAttribute('aria-rowindex'))).toEqual(['4']);
  });

  it('re-derives aria-rowcount after a data swap', async () => {
    const el = await mount();
    expect(table(el).getAttribute('aria-rowcount')).toBe('4'); // 3 rows + header

    (el as unknown as { data: unknown }).data = [
      ...DATA,
      { id: 4, name: 'Delta' },
      { id: 5, name: 'Epsilon' },
    ];
    await el.updateComplete;
    expect(table(el).getAttribute('aria-rowcount')).toBe('6');
  });
});

describe('mp-datatable tree row state', () => {
  const TREE: Row[] = [
    { id: 1, name: 'Parent', childCount: 2 },
    { id: 2, name: 'Leaf', childCount: 0 },
  ];

  async function mountTree(): Promise<MpDatatable> {
    const el = await mount('tree', TREE);
    (el as unknown as { idKey: unknown }).idKey = 'id';
    (el as unknown as { childCountKey: unknown }).childCountKey = 'childCount';
    await settle(el);
    return el;
  }

  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('exposes aria-expanded on parents only, and keeps row + chevron in step under both drivers', async () => {
    const el = await mountTree();
    const chevron = () => shadow(el).querySelector<HTMLButtonElement>('button.tree-chevron')!;
    expect(bodyRows(el)[0].getAttribute('aria-expanded')).toBe('false');
    expect(bodyRows(el)[1].hasAttribute('aria-expanded')).toBe(false);
    expect(chevron().getAttribute('aria-expanded')).toBe('false');
    expect(chevron().getAttribute('aria-label')).toBe('Expand row');

    // Programmatic: the setter path, which an event-only implementation misses.
    (el as unknown as { expandedIds: unknown }).expandedIds = new Set([1]);
    await settle(el);
    expect(bodyRows(el)[0].getAttribute('aria-expanded')).toBe('true');
    expect(chevron().getAttribute('aria-expanded')).toBe('true');
    expect(chevron().getAttribute('aria-label')).toBe('Collapse row');

    // User-driven collapse returns both nodes to false.
    chevron().click();
    await settle(el);
    expect(bodyRows(el)[0].getAttribute('aria-expanded')).toBe('false');
    expect(chevron().getAttribute('aria-expanded')).toBe('false');
  });

  it('reports depth via aria-level (1-based), and omits it in flat mode', async () => {
    const el = await mountTree();
    (el as unknown as { expandedIds: unknown }).expandedIds = new Set([1]);
    await settle(el);

    const levels = bodyRows(el).map((r) => r.getAttribute('aria-level'));
    // Parent, its two reserved children, then the leaf sibling.
    expect(levels).toEqual(['1', '2', '2', '1']);

    (el as unknown as { tree: boolean }).tree = false;
    await settle(el);
    expect(bodyRows(el).some((r) => r.hasAttribute('aria-level'))).toBe(false);
  });

  it('marks reserved (not-yet-loaded) rows aria-busy and never selectable', async () => {
    const el = await mountTree();
    (el as unknown as { selectionMode: string }).selectionMode = 'multiple';
    (el as unknown as { expandedIds: unknown }).expandedIds = new Set([1]);
    await settle(el);

    const placeholders = bodyRows(el).filter((r) => r.dataset['placeholder'] === 'true');
    expect(placeholders).toHaveLength(2);
    expect(placeholders.every((r) => r.getAttribute('aria-busy') === 'true')).toBe(true);
    expect(placeholders.some((r) => r.hasAttribute('aria-selected'))).toBe(false);
    // Real rows are not busy — the state distinguishes them.
    expect(bodyRows(el)[0].hasAttribute('aria-busy')).toBe(false);
  });
});

describe('mp-datatable column-resize separator value', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('exposes separator semantics and moves aria-valuenow in both directions', async () => {
    const el = await mount();
    const handle = () => th(el, 'name').querySelector<HTMLElement>('.resize-handle')!;
    expect(handle().getAttribute('role')).toBe('separator');
    expect(handle().getAttribute('aria-orientation')).toBe('vertical');
    expect(handle().getAttribute('aria-label')).toBe('Resize column Name');
    expect(handle().getAttribute('aria-valuemin')).toBe('40');
    // A focusable separator REQUIRES aria-valuenow (axe critical), so an
    // unmeasured column backfills from the header's real width — which in
    // jsdom's zero-layout world is 0.
    expect(handle().getAttribute('aria-valuenow')).toBe('0');

    pressKey(handle(), 'ArrowRight');
    await el.updateComplete;
    expect(handle().getAttribute('aria-valuenow')).toBe('40'); // clamped at the floor

    pressKey(handle(), 'ArrowRight');
    await el.updateComplete;
    expect(handle().getAttribute('aria-valuenow')).toBe('50');

    pressKey(handle(), 'ArrowLeft');
    await el.updateComplete;
    expect(handle().getAttribute('aria-valuenow')).toBe('40');
  });
});

describe('mp-datatable live-region content per action', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('announces the sort column and direction on each sort change', async () => {
    const el = await mount();
    clickHeader(el, 'name');
    await el.updateComplete;
    expect(liveText(el)).toBe('Sorted by Name, ascending');

    clickHeader(el, 'name');
    await el.updateComplete;
    expect(liveText(el)).toBe('Sorted by Name, descending');

    // Shift-cycling the column out announces the removal, not a direction.
    clickHeader(el, 'name', { shiftKey: true });
    await el.updateComplete;
    expect(liveText(el)).toBe('Sorting removed from Name');
  });

  it('announces the selection count, which is invisible from aria-selected alone', async () => {
    const el = await mount('selection-mode="multiple"');
    clickRow(el, 0);
    await el.updateComplete;
    expect(liveText(el)).toBe('1 row selected');

    clickRow(el, 1, { ctrlKey: true });
    await el.updateComplete;
    expect(liveText(el)).toBe('2 rows selected');
  });

  it('announces the new page when the footer pager moves', async () => {
    const el = await mount('pagination');
    (el as unknown as { perPage: number }).perPage = 2;
    await settle(el);

    shadow(el).querySelector('mp-pagination.datatable-pagination')!.dispatchEvent(
      new CustomEvent('mp-pagination-page-change', {
        detail: { page: 2 },
        bubbles: true,
        composed: true,
      }),
    );
    await el.updateComplete;
    expect(liveText(el)).toBe('Page 2 of 2');
  });
});
