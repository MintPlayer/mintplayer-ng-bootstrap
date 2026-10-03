import * as React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { BsDatatable } from '@mintplayer/react-bootstrap/datatable';
import type { MpDatatable } from '@mintplayer/web-components/datatable';

import { emit, render, renderEl } from './harness';

/**
 * `BsDatatable` wraps a `createComponent` declaration, so `rowLabel` reaches
 * the element only if `@lit/react` treats it as an element property (it does
 * for any name the element class defines). That is silent when wrong: a
 * function serialised into an attribute does nothing.
 *
 * `selectedRows` is the one with a trap: its setter REPLACES the selection,
 * and `@lit/react` re-assigns every property on every render (it leaves
 * dirty-checking to the element). Passed straight through, an unrelated prop
 * change would revert the user's clicks to the stale prop — so the wrapper
 * pushes it only when its own reference changes.
 */

interface Row { id: number; name: string; }

const COLUMNS = [{ name: 'name', label: 'Name' }];
const DATA: Row[] = [{ id: 1, name: 'Alpha' }, { id: 2, name: 'Bravo' }];

describe('BsDatatable — selection props', () => {
  it('selectedRows reaches the element: the keys are derived, the rows remembered', async () => {
    const offPage: Row = { id: 50, name: 'Not loaded' };
    const el = await renderEl<MpDatatable>(
      <BsDatatable columns={COLUMNS} data={DATA} selectionMode="multiple" selectedRows={[DATA[0], offPage]} />,
      'mp-datatable',
    );
    expect(el.selectedIds).toEqual(['1', '50']);
    expect(el.selectedRows[1]).toBe(offPage);
  });

  it('selectedRows is not re-pushed when another prop changes', async () => {
    const seed = [DATA[0]];
    const el = await renderEl<MpDatatable>(
      <BsDatatable columns={COLUMNS} data={DATA} selectionMode="multiple" selectedRows={seed} />,
      'mp-datatable',
    );
    const push = vi.spyOn(el, 'selectedRows', 'set');
    await render(<BsDatatable columns={COLUMNS} data={DATA} selectionMode="checkbox" selectedRows={seed} />);
    expect(el.selectionMode).toBe('checkbox');
    expect(push).not.toHaveBeenCalled();
  });

  it("a user's click survives a re-render that keeps the same selectedRows", async () => {
    const seed = [DATA[0]];
    const el = await renderEl<MpDatatable>(
      <BsDatatable columns={COLUMNS} data={DATA} selectionMode="multiple" selectedRows={seed} />,
      'mp-datatable',
    );
    await el.updateComplete;
    el.querySelector<HTMLElement>('tbody tr[data-row-key="2"]')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(el.selectedIds).toEqual(['2']);
    await render(<BsDatatable columns={COLUMNS} data={DATA} selectionMode="multiple" selectedRows={seed} rowLabel={() => 'x'} />);
    expect(el.selectedIds).toEqual(['2']);

    // A NEW reference is a new seed and does replace the selection.
    await render(<BsDatatable columns={COLUMNS} data={DATA} selectionMode="multiple" selectedRows={[DATA[0]]} />);
    expect(el.selectedIds).toEqual(['1']);
  });

  it('rowLabel reaches the element as the same function', async () => {
    const rowLabel = (row: unknown) => `#${(row as Row).name}`;
    const el = await renderEl<MpDatatable>(
      <BsDatatable columns={COLUMNS} data={DATA} rowLabel={rowLabel} />,
      'mp-datatable',
    );
    expect(el.rowLabel).toBe(rowLabel);
  });

  it("selectionMode 'checkbox' reaches the element", async () => {
    const el = await renderEl<MpDatatable>(
      <BsDatatable columns={COLUMNS} data={DATA} selectionMode="checkbox" />,
      'mp-datatable',
    );
    expect(el.selectionMode).toBe('checkbox');
  });

  it('onSelectionChange receives the index-aligned detail, holes included', async () => {
    const seen: CustomEvent[] = [];
    const el = await renderEl<MpDatatable>(
      <BsDatatable columns={COLUMNS} data={DATA} onSelectionChange={(e) => seen.push(e)} />,
      'mp-datatable',
    );
    const detail = { selectedIds: ['99', '1'], selectedRows: [undefined, DATA[0]] };
    await emit(el, 'mp-datatable-selection-change', detail);
    expect(seen).toHaveLength(1);
    expect(seen[0].detail).toEqual(detail);
  });

  it('reload() through the element ref costs one request with a stable fetch', async () => {
    const pages: number[] = [];
    const fetch = async (req: { page: number; perPage: number }) => {
      pages.push(req.page);
      return { data: DATA, totalRecords: DATA.length };
    };
    const ref = React.createRef<MpDatatable>();
    await render(<BsDatatable ref={ref} columns={COLUMNS} fetch={fetch as never} />);
    await new Promise((r) => setTimeout(r));
    expect(pages).toEqual([1]);

    // A re-render with the same callback is not a new source (#407).
    await render(<BsDatatable ref={ref} columns={COLUMNS} fetch={fetch as never} selectionMode="multiple" />);
    await new Promise((r) => setTimeout(r));
    expect(pages).toEqual([1]);

    ref.current!.reload();
    await new Promise((r) => setTimeout(r));
    expect(pages).toEqual([1, 1]);
  });
});
