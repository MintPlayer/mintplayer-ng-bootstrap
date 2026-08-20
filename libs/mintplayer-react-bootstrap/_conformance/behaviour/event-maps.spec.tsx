import * as React from 'react';
import { describe, expect, it } from 'vitest';

import { BsDatatable } from '@mintplayer/react-bootstrap/datatable';
import { BsScheduler } from '@mintplayer/react-bootstrap/scheduler';

import { emit, renderEl } from './harness';

/**
 * `BsScheduler` and `BsDatatable` are pure `createComponent` declarations: a
 * tag name, an element class, and a map from DOM event name to React prop.
 * TypeScript checks the *payload* type of each entry and nothing else — the
 * event name on the left is an unchecked string literal, and the datatable's
 * are long and prefixed (`mp-datatable-row-dblclick`), which is exactly the
 * shape a typo survives in.
 *
 * A wrong name here produces a component that renders correctly and never
 * calls the consumer's handler. These tests dispatch the event the web
 * component actually dispatches and assert it arrives.
 */

const SCHEDULER_EVENTS: [string, string][] = [
  ['event-selected', 'onEventSelected'],
  ['event-dblclick', 'onEventDblClick'],
  ['event-create', 'onEventCreate'],
  ['event-update', 'onEventUpdate'],
  ['event-delete', 'onEventDelete'],
  ['date-click', 'onDateClick'],
  ['view-change', 'onViewChange'],
  ['selection-change', 'onSelectionChange'],
  ['resource-create', 'onResourceCreate'],
  ['group-create', 'onGroupCreate'],
  ['resource-update', 'onResourceUpdate'],
  ['resource-delete', 'onResourceDelete'],
];

const DATATABLE_EVENTS: [string, string][] = [
  ['mp-datatable-page-change', 'onPageChange'],
  ['mp-datatable-per-page-change', 'onPerPageChange'],
  ['mp-datatable-sort-change', 'onSortChange'],
  ['mp-datatable-row-click', 'onRowClick'],
  ['mp-datatable-row-dblclick', 'onRowDblClick'],
  ['mp-datatable-row-contextmenu', 'onRowContextMenu'],
  ['mp-datatable-selection-change', 'onSelectionChange'],
  ['mp-datatable-row-expand', 'onRowExpand'],
  ['mp-datatable-row-collapse', 'onRowCollapse'],
  ['mp-datatable-expanded-ids-change', 'onExpandedIdsChange'],
];

describe('BsScheduler — event map', () => {
  it.each(SCHEDULER_EVENTS)('routes %s to %s', async (event, prop) => {
    const seen: CustomEvent[] = [];
    const el = await renderEl(
      React.createElement(BsScheduler, { [prop]: (e: CustomEvent) => seen.push(e) }),
      'mp-scheduler',
    );

    await emit(el, event, { probe: event });

    expect(seen, `${event} never reached ${prop}`).toHaveLength(1);
    expect(seen[0].detail).toEqual({ probe: event });
  });

  it('maps every event the scheduler declares', () => {
    expect(SCHEDULER_EVENTS).toHaveLength(12);
  });
});

describe('BsDatatable — event map', () => {
  it.each(DATATABLE_EVENTS)('routes %s to %s', async (event, prop) => {
    const seen: CustomEvent[] = [];
    const el = await renderEl(
      React.createElement(BsDatatable, { [prop]: (e: CustomEvent) => seen.push(e) }),
      'mp-datatable',
    );

    await emit(el, event, { probe: event });

    expect(seen, `${event} never reached ${prop}`).toHaveLength(1);
    expect(seen[0].detail).toEqual({ probe: event });
  });

  // Click and double-click differ by four characters at the end of a long
  // prefixed name, and swapping them is undetectable without an assertion.
  it('keeps row-click and row-dblclick apart', async () => {
    const clicks: CustomEvent[] = [];
    const dbl: CustomEvent[] = [];
    const el = await renderEl(
      <BsDatatable onRowClick={(e) => clicks.push(e)} onRowDblClick={(e) => dbl.push(e)} />,
      'mp-datatable',
    );

    await emit(el, 'mp-datatable-row-click', { row: 1 });

    expect(clicks).toHaveLength(1);
    expect(dbl).toHaveLength(0);
  });

  it('maps every event the datatable declares', () => {
    expect(DATATABLE_EVENTS).toHaveLength(10);
  });
});
