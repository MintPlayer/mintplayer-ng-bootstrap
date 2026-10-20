import { describe, expect, it } from 'vitest';

import {
  DEFAULT_PERMISSIONS,
  resolveCapability,
  resolveResizeEdge,
  type SchedulerCapability,
} from './permissions';
import type { SchedulerEvent } from './event';

/**
 * What the scheduler will offer to do.
 *
 * The precedence chain is the substance: `readonly` beats everything, then a
 * blanket `permissions: false`, then the per-capability table, then the
 * per-item override, then the defaults. And the direction is one-way — a
 * per-item flag can only ever **deny**. An item that could re-enable something
 * the host switched off would let data widen a policy set in code, which is
 * backwards, and the same OR-down-the-tree rule mp-query-builder uses.
 *
 * The source is explicit that this is an honesty API rather than a security
 * boundary: it stops the UI offering, announcing and documenting actions that
 * cannot succeed. These specs assert exactly that and claim nothing more.
 */

const EVENT_CAPS: SchedulerCapability[] = [
  'createEvent',
  'moveEvent',
  'resizeEvent',
  'deleteEvent',
  'editEvent',
  'selectRange',
];

const RESOURCE_CAPS: SchedulerCapability[] = [
  'createResource',
  'updateResource',
  'deleteResource',
  'createGroup',
];

const event = (overrides: Partial<SchedulerEvent> = {}): SchedulerEvent =>
  ({
    id: 'e1',
    title: 'Standup',
    start: new Date(2026, 0, 1, 9, 0),
    end: new Date(2026, 0, 1, 10, 0),
    ...overrides,
  }) as SchedulerEvent;

describe('the defaults', () => {
  it('allows everything about events', () => {
    for (const capability of EVENT_CAPS) {
      expect(DEFAULT_PERMISSIONS[capability], capability).toBe(true);
    }
  });

  // No surveyed calendar library ships resource-creation UI, so the default is
  // that resources are data the application supplies.
  it('withholds resource and group mutation', () => {
    for (const capability of RESOURCE_CAPS) {
      expect(DEFAULT_PERMISSIONS[capability], capability).toBe(false);
    }
  });

  it('applies when nothing is configured', () => {
    expect(resolveCapability('moveEvent', {})).toBe(true);
    expect(resolveCapability('createResource', {})).toBe(false);
  });
});

describe('resolveCapability — the precedence chain', () => {
  it('lets readonly override everything', () => {
    for (const capability of EVENT_CAPS) {
      expect(
        resolveCapability(capability, { readonly: true, permissions: { [capability]: true } }),
        capability,
      ).toBe(false);
    }
  });

  // The single most common request — make it read-only — without spelling out
  // ten flags.
  it('treats permissions: false as a blanket refusal', () => {
    for (const capability of EVENT_CAPS) {
      expect(resolveCapability(capability, { permissions: false }), capability).toBe(false);
    }
  });

  it('treats permissions: true as "use the defaults"', () => {
    expect(resolveCapability('moveEvent', { permissions: true })).toBe(true);
    expect(resolveCapability('createResource', { permissions: true })).toBe(false);
  });

  it('honours a single flag from the table', () => {
    expect(resolveCapability('moveEvent', { permissions: { moveEvent: false } })).toBe(false);
  });

  it('leaves the other flags at their defaults', () => {
    const permissions = { moveEvent: false };
    expect(resolveCapability('resizeEvent', { permissions })).toBe(true);
    expect(resolveCapability('createResource', { permissions })).toBe(false);
  });

  it('can switch a resource capability on', () => {
    expect(resolveCapability('createResource', { permissions: { createResource: true } })).toBe(true);
  });
});

describe('resolveCapability — per-item overrides', () => {
  it('allows an ordinary event everything the host allows', () => {
    expect(resolveCapability('moveEvent', { event: event() })).toBe(true);
    expect(resolveCapability('resizeEvent', { event: event() })).toBe(true);
  });

  // `editable: false` is the item-level equivalent of read-only, so it denies
  // every mutation rather than only the editor.
  it('lets editable: false deny every mutation of that event', () => {
    for (const capability of ['moveEvent', 'resizeEvent', 'deleteEvent', 'editEvent'] as const) {
      expect(resolveCapability(capability, { event: event({ editable: false }) }), capability).toBe(
        false,
      );
    }
  });

  it('lets draggable: false pin an event in time without locking its length', () => {
    const pinned = event({ draggable: false });
    expect(resolveCapability('moveEvent', { event: pinned })).toBe(false);
    expect(resolveCapability('resizeEvent', { event: pinned })).toBe(true);
  });

  it('lets resizable: false lock the length without pinning the event', () => {
    const fixed = event({ resizable: false });
    expect(resolveCapability('resizeEvent', { event: fixed })).toBe(false);
    expect(resolveCapability('moveEvent', { event: fixed })).toBe(true);
  });

  /*
   * One-way, and this is the case that makes it matter. An item flag that could
   * re-enable a capability the host switched off would let DATA widen a policy
   * set in CODE — so a single event marked `draggable: true` could not reopen
   * dragging in a scheduler the host had made read-only.
   */
  it('never lets an item re-enable what the host switched off', () => {
    expect(
      resolveCapability('moveEvent', {
        permissions: { moveEvent: false },
        event: event({ draggable: true, editable: true }),
      }),
    ).toBe(false);
  });

  it('never lets an item override readonly', () => {
    expect(
      resolveCapability('moveEvent', { readonly: true, event: event({ draggable: true }) }),
    ).toBe(false);
  });

  it('ignores item flags for capabilities that are not about the item', () => {
    expect(resolveCapability('createEvent', { event: event({ draggable: false }) })).toBe(true);
    expect(resolveCapability('selectRange', { event: event({ draggable: false }) })).toBe(true);
  });

  it('treats a null event as no item at all', () => {
    expect(resolveCapability('moveEvent', { event: null })).toBe(true);
  });
});

describe('resizeEvent versus a per-edge lock', () => {
  // "Resizable at all" is the question `resizeEvent` answers, so one open edge
  // is enough — a toolbar that hid the resize affordance for an event whose end
  // is still draggable would be wrong.
  it('counts an event with one open edge as resizable', () => {
    expect(
      resolveCapability('resizeEvent', { event: event({ resizable: { start: false, end: true } }) }),
    ).toBe(true);
    expect(
      resolveCapability('resizeEvent', { event: event({ resizable: { start: true, end: false } }) }),
    ).toBe(true);
  });

  it('counts an event with both edges locked as not resizable', () => {
    expect(
      resolveCapability('resizeEvent', { event: event({ resizable: { start: false, end: false } }) }),
    ).toBe(false);
  });
});

describe('resolveResizeEdge', () => {
  it('allows either edge of an ordinary event', () => {
    expect(resolveResizeEdge('start', { event: event() })).toBe(true);
    expect(resolveResizeEdge('end', { event: event() })).toBe(true);
  });

  /*
   * Per-edge locking is data-dependent — "this shift already clocked in, so its
   * start is pinned, but you may still extend it" — which is exactly what an
   * item flag is for. The object form was declared on the model while only the
   * `=== false` boolean branch was ever checked, so it silently did nothing.
   */
  it('locks only the edge the event pins', () => {
    const clockedIn = event({ resizable: { start: false, end: true } });
    expect(resolveResizeEdge('start', { event: clockedIn })).toBe(false);
    expect(resolveResizeEdge('end', { event: clockedIn })).toBe(true);
  });

  it('locks the other edge just the same', () => {
    const closed = event({ resizable: { start: true, end: false } });
    expect(resolveResizeEdge('start', { event: closed })).toBe(true);
    expect(resolveResizeEdge('end', { event: closed })).toBe(false);
  });

  it('locks both edges for resizable: false', () => {
    expect(resolveResizeEdge('start', { event: event({ resizable: false }) })).toBe(false);
    expect(resolveResizeEdge('end', { event: event({ resizable: false }) })).toBe(false);
  });

  it('allows both edges for resizable: true', () => {
    expect(resolveResizeEdge('start', { event: event({ resizable: true }) })).toBe(true);
  });

  it('refuses every edge when the host denies resizing', () => {
    expect(
      resolveResizeEdge('end', {
        permissions: { resizeEvent: false },
        event: event({ resizable: { start: true, end: true } }),
      }),
    ).toBe(false);
  });

  it('refuses every edge under readonly', () => {
    expect(resolveResizeEdge('end', { readonly: true, event: event() })).toBe(false);
  });

  it('refuses every edge for an uneditable event', () => {
    expect(resolveResizeEdge('end', { event: event({ editable: false }) })).toBe(false);
  });

  it('allows an edge with no event in hand', () => {
    expect(resolveResizeEdge('start', {})).toBe(true);
  });
});
