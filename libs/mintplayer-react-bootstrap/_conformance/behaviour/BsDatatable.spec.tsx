import * as React from 'react';
import { act } from 'react';
import { describe, expect, it } from 'vitest';

import {
  BsDatatable,
  type DatatableColumnDef,
  type DatatableFilters,
  type FilterContext,
  type SelectionChangeEventDetail,
  type SortColumn,
} from '@mintplayer/react-bootstrap/datatable';

import { renderEl } from './harness';

/**
 * `BsDatatable` renders the headless datatable itself (#437). The core's spec
 * covers the behaviour; this pins what is React's own: two-way inputs report
 * through `on<Name>Change`, outputs are `on<Name>` props, and the slot props
 * render React content in the header and cells.
 */

interface Row {
  id: number;
  name: string;
}

const COLUMNS: DatatableColumnDef[] = [{ name: 'name', label: 'Name' }];
const DATA: Row[] = [
  { id: 1, name: 'Alpha' },
  { id: 2, name: 'Bravo' },
];

const click = (el: Element) => act(async () => (el as HTMLElement).click());

describe('BsDatatable', () => {
  it('renders the rows and names the table by the consumer aria-label', async () => {
    const root = await renderEl(<BsDatatable columns={COLUMNS} data={DATA} aria-label="Artists" />, 'div.datatable');
    expect(root.querySelector('table')!.getAttribute('aria-label')).toBe('Artists');
    expect([...root.querySelectorAll('tbody td')].map((td) => td.textContent?.trim())).toEqual(['Alpha', 'Bravo']);
  });

  it('reports a sort through onSortColumnsChange', async () => {
    const seen: SortColumn[][] = [];
    const root = await renderEl(<BsDatatable columns={COLUMNS} data={DATA} onSortColumnsChange={(s) => seen.push(s)} />, 'div.datatable');
    await click(root.querySelector('[data-dt-sort="name"]')!);
    expect(seen.at(-1)).toEqual([{ property: 'name', direction: 'ascending' }]);
  });

  it('reports a row click and the selection', async () => {
    const selections: SelectionChangeEventDetail[] = [];
    let clicks = 0;
    const root = await renderEl(
      <BsDatatable
        columns={COLUMNS}
        data={DATA}
        selectionMode="single"
        onSelectionChanged={(d) => selections.push(d)}
        onRowClick={() => clicks++}
      />,
      'div.datatable',
    );
    await click(root.querySelector('tbody tr[data-row-key="2"]')!);
    expect(selections.at(-1)).toEqual({ selectedIds: ['2'], selectedRows: [DATA[1]] });
    expect(clicks).toBe(1);
  });

  it('keeps a checked row box in step with the selection', async () => {
    const root = await renderEl(
      <BsDatatable columns={COLUMNS} data={DATA} selectionMode="checkbox" selectedIds={['1']} />,
      'div.datatable',
    );
    const boxes = [...root.querySelectorAll<HTMLInputElement>('tbody input[type=checkbox]')];
    expect(boxes.map((b) => b.checked)).toEqual([true, false]);
  });

  it('renders the header and cell slots as React content', async () => {
    const root = await renderEl(
      <BsDatatable
        columns={COLUMNS}
        data={DATA}
        header={({ column }) => <b>head:{column.label}</b>}
        cell={({ row }) => <i>cell:{(row as Row).name}</i>}
      />,
      'div.datatable',
    );
    expect(root.querySelector('thead b')?.textContent).toBe('head:Name');
    expect([...root.querySelectorAll('tbody i')].map((i) => i.textContent)).toEqual(['cell:Alpha', 'cell:Bravo']);
  });

  it('keeps a custom filter panel, and its own state, across close and reopen; ctx updates in place (#465 T1/T7)', async () => {
    let mounts = 0;
    function Panel({ ctx }: { ctx: FilterContext }) {
      const [bumps, setBumps] = React.useState(0);
      React.useEffect(() => {
        mounts++;
      }, []);
      return (
        <div className="probe" data-term={ctx.term} data-selected={ctx.selection.values.map((v) => String(v.value)).join(',')}>
          <button type="button" className="bump" onClick={() => setBumps((n) => n + 1)}>
            {bumps}
          </button>
        </div>
      );
    }
    const columns: DatatableColumnDef[] = [{ name: 'name', label: 'Name', filterable: true, filterMode: 'custom' }];
    let setFilters: (f: DatatableFilters) => void = () => undefined;
    function Host() {
      const [filters, set] = React.useState<DatatableFilters>({});
      setFilters = set;
      return <BsDatatable columns={columns} data={DATA} filters={filters} onFiltersChange={set} filter={({ ctx }) => <Panel ctx={ctx} />} />;
    }
    const root = await renderEl(<Host />, 'div.datatable');
    const panel = root.querySelector<HTMLElement>('[data-dt-filter-panel="name"]')!;
    const toggle = (newState: 'open' | 'closed') =>
      act(async () => {
        const ev = new Event('toggle');
        Object.defineProperty(ev, 'newState', { value: newState });
        panel.dispatchEvent(ev);
      });

    await toggle('open');
    const probe = panel.querySelector<HTMLElement>('.probe')!;
    await click(probe.querySelector('.bump')!);
    await click(probe.querySelector('.bump')!);
    await act(async () => setFilters({ name: { values: ['Alpha'], inverse: false } }));
    expect(panel.querySelector('.probe')).toBe(probe);
    expect(probe.dataset['selected']).toBe('Alpha');
    await toggle('closed');
    await toggle('open');
    expect(panel.querySelector('.probe')).toBe(probe);
    expect(probe.querySelector('.bump')!.textContent).toBe('2');
    expect(probe.dataset['selected']).toBe('Alpha');
    expect(probe.dataset['term']).toBe('');
    expect(mounts).toBe(1);
  });
});
