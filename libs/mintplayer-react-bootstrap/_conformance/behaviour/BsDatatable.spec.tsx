import * as React from 'react';
import { act } from 'react';
import { describe, expect, it } from 'vitest';

import { BsDatatable, type DatatableColumnDef, type SelectionChangeEventDetail, type SortColumn } from '@mintplayer/react-bootstrap/datatable';

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
        onSelectionChange={(d) => selections.push(d)}
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
});
