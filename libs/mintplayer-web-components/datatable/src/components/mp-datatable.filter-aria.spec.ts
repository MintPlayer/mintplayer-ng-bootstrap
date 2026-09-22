import { beforeEach, describe, expect, it } from 'vitest';
import './mp-datatable';
import type { MpDatatable } from './mp-datatable';
import type { DatatableColumnDef } from '../types';

const DATA = [
  { id: 1, name: 'Ada' },
  { id: 2, name: 'Grace' },
  { id: 3, name: 'Alan' },
];

const COLUMNS: DatatableColumnDef[] = [
  { name: 'id', label: 'ID' },
  { name: 'name', label: 'Name' },
];

const withFilter = (overrides: Partial<DatatableColumnDef> = {}): DatatableColumnDef[] => [
  COLUMNS[0],
  {
    ...COLUMNS[1],
    filterable: true,
    filterRenderer: () => document.createElement('input'),
    ...overrides,
  },
];

async function settle(el: MpDatatable) {
  await el.updateComplete;
  await new Promise((r) => setTimeout(r, 0));
  await el.updateComplete;
}

async function mount(cols: DatatableColumnDef[]) {
  document.body.innerHTML = `<mp-datatable></mp-datatable>`;
  const el = document.querySelector('mp-datatable') as MpDatatable;
  (el as unknown as { columns: DatatableColumnDef[] }).columns = cols;
  (el as unknown as { data: unknown[] }).data = DATA;
  await settle(el);
  return el;
}

const root = (el: MpDatatable) => el.renderRoot as unknown as ParentNode;
const table = (el: MpDatatable) => root(el).querySelector('table')!;
const bodyRows = (el: MpDatatable) => [...root(el).querySelectorAll('tbody tr[data-row-key]')];
const trigger = (el: MpDatatable) =>
  root(el).querySelector<HTMLButtonElement>('tr.filter-row th[data-column="name"] .filter-trigger')!;

describe('mp-datatable filter row — ARIA', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  /**
   * The arithmetic was hard-coded to exactly one header row (`rows + 1`,
   * `rowIndex + 2`). A second row makes those wrong for every row in the grid,
   * silently, so both cases are asserted rather than just the new one.
   */
  describe('row index arithmetic', () => {
    it('is unchanged when there is no filter row', async () => {
      const el = await mount(COLUMNS);

      expect(table(el).getAttribute('aria-rowcount')).toBe(String(DATA.length + 1));
      expect(root(el).querySelector('thead tr')!.getAttribute('aria-rowindex')).toBe('1');
      expect(bodyRows(el).map((r) => r.getAttribute('aria-rowindex'))).toEqual(['2', '3', '4']);
    });

    it('shifts by one when the filter row is present', async () => {
      const el = await mount(withFilter());

      expect(table(el).getAttribute('aria-rowcount')).toBe(String(DATA.length + 2));
      expect(root(el).querySelector('thead tr:first-child')!.getAttribute('aria-rowindex')).toBe('1');
      expect(root(el).querySelector('tr.filter-row')!.getAttribute('aria-rowindex')).toBe('2');
      expect(bodyRows(el).map((r) => r.getAttribute('aria-rowindex'))).toEqual(['3', '4', '5']);
    });

    it('never announces a body row at the filter row’s index', async () => {
      const el = await mount(withFilter());
      const filterIndex = root(el).querySelector('tr.filter-row')!.getAttribute('aria-rowindex');

      for (const row of bodyRows(el)) {
        expect(row.getAttribute('aria-rowindex')).not.toBe(filterIndex);
      }
    });
  });

  describe('the trigger', () => {
    it('is a real button with a localized, column-specific name', async () => {
      const el = await mount(withFilter());
      const btn = trigger(el);

      expect(btn.tagName).toBe('BUTTON');
      expect(btn.getAttribute('type')).toBe('button');
      // Routed through labels, not a hard-coded literal — a name that only
      // exists in English is a translation bug.
      expect(btn.getAttribute('aria-label')).toBe('Filter Name');
    });

    /**
     * Three distinct names, not a name plus a visual state. A user who cannot
     * see the trigger's active styling has nothing else telling them the column
     * is filtered, so it has to be part of the accessible name.
     */
    it('names an active column as filtered, with its summary when there is one', async () => {
      const active = await mount(withFilter({ filterActive: true }));
      expect(trigger(active).getAttribute('aria-label')).toBe('Filter Name, filtered');

      const summarised = await mount(withFilter({ filterActive: true, filterSummary: '2 selected' }));
      expect(trigger(summarised).getAttribute('aria-label')).toBe(
        'Filter Name, filtered by 2 selected',
      );
      // The summary is also visible text, so the state is not colour-only.
      expect(trigger(summarised).querySelector('.filter-summary')?.textContent).toContain('2 selected');
    });

    it('reports its state, and updates it in the same render as the panel', async () => {
      const el = await mount(withFilter());
      expect(trigger(el).getAttribute('aria-expanded')).toBe('false');

      trigger(el).click();
      await settle(el);
      expect(trigger(el).getAttribute('aria-expanded')).toBe('true');

      trigger(el).click();
      await settle(el);
      expect(trigger(el).getAttribute('aria-expanded')).toBe('false');
    });

    it('points aria-controls at the open panel, and resolves it', async () => {
      const el = await mount(withFilter());
      trigger(el).click();
      await settle(el);

      const id = trigger(el).getAttribute('aria-controls');
      expect(id).toBeTruthy();

      // The panel lives in document.body, not in this element — the IDREF
      // resolves only because there is no shadow boundary on the path.
      const panel = document.getElementById(id!);
      expect(panel).not.toBeNull();
      expect(panel!.classList.contains('filter-panel')).toBe(true);
      expect(el.contains(panel)).toBe(false);
    });

    it('drops aria-controls when the panel is closed', async () => {
      const el = await mount(withFilter());
      // A dangling IDREF to a node that no longer exists is worse than none.
      expect(trigger(el).getAttribute('aria-controls')).toBeNull();
    });
  });

  describe('events', () => {
    it('reports open and close with the column, and nothing else', async () => {
      const el = await mount(withFilter());
      const seen: { type: string; detail: unknown }[] = [];
      for (const type of ['mp-datatable-filter-open', 'mp-datatable-filter-close']) {
        el.addEventListener(type, (e) => seen.push({ type, detail: (e as CustomEvent).detail }));
      }

      trigger(el).click();
      await settle(el);
      trigger(el).click();
      await settle(el);

      expect(seen.map((s) => s.type)).toEqual(['mp-datatable-filter-open', 'mp-datatable-filter-close']);
      // No predicate, no value, no state: the column name is the whole payload.
      expect(seen[0].detail).toEqual({ column: 'name' });
      expect(seen[1].detail).toEqual({ column: 'name' });
    });
  });

  describe('the panel', () => {
    it('opens into the document-root overlay container', async () => {
      const el = await mount(withFilter());
      trigger(el).click();
      await settle(el);

      const panel = document.querySelector('mp-overlay-container .mp-overlay-pane .filter-panel');
      expect(panel).not.toBeNull();
      expect(el.contains(panel)).toBe(false);
    });

    it('is torn down on close', async () => {
      const el = await mount(withFilter());
      trigger(el).click();
      await settle(el);
      trigger(el).click();
      await settle(el);

      expect(document.querySelector('.filter-panel')).toBeNull();
      expect(document.querySelector('mp-overlay-container')).toBeNull();
    });

    it('is announced as a dialog named for its column', async () => {
      const el = await mount(withFilter());
      trigger(el).click();
      await settle(el);

      const panel = document.querySelector('.filter-panel')!;
      expect(panel.getAttribute('role')).toBe('dialog');
      expect(panel.getAttribute('aria-label')).toBe('Filter Name');
    });
  });
});
