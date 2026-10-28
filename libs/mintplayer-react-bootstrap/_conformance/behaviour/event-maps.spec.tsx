import * as React from 'react';
import { describe, expect, it } from 'vitest';

import { BsScheduler } from '@mintplayer/react-bootstrap/scheduler';

import { emit, renderEl } from './harness';

/**
 * `BsScheduler` is a `createComponent` declaration: a
 * tag name, an element class, and a map from DOM event name to React prop.
 * TypeScript checks the *payload* type of each entry and nothing else — the
 * event name on the left is an unchecked string literal, which is exactly the
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

