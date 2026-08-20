import { describe, expect, it, vi } from 'vitest';

import { SchedulerStateManager } from './scheduler-state';
import type { Resource, ResourceGroup, SchedulerEvent, TimeSlot } from '@mintplayer/web-components/scheduler-core';

/**
 * The scheduler's state store.
 *
 * Two things here are worth pinning beyond the obvious CRUD. **Events may be
 * authored in two places** — a flat array, or nested under the resources —
 * and the store merges them into one list every view reads, so an event
 * created on a timeline row is not invisible in the month view. And the
 * **derived indexes rebuild only when their sources change identity**, which is
 * what keeps a drag from re-indexing every event on every animation frame; the
 * subtlety is that the event index depends on the resource index, so deleting a
 * resource has to rebuild it even though no event was written.
 */

const slot = (hour: number): TimeSlot =>
  ({
    start: new Date(2026, 0, 15, hour, 0),
    end: new Date(2026, 0, 15, hour + 1, 0),
  }) as TimeSlot;

const event = (id: string, overrides: Partial<SchedulerEvent> = {}): SchedulerEvent =>
  ({
    id,
    title: id,
    start: new Date(2026, 0, 15, 9, 0),
    end: new Date(2026, 0, 15, 10, 0),
    ...overrides,
  }) as SchedulerEvent;

const resource = (id: string, overrides: Partial<Resource> = {}): Resource =>
  ({ id, name: id, ...overrides }) as Resource;

const group = (id: string, children: (Resource | ResourceGroup)[], collapsed?: boolean) =>
  ({ id, name: id, children, collapsed }) as unknown as ResourceGroup;

describe('SchedulerStateManager — events', () => {
  it('starts empty', () => {
    expect(new SchedulerStateManager().getState().events).toEqual([]);
  });

  it('takes a flat list', () => {
    const store = new SchedulerStateManager();
    store.setEvents([event('a'), event('b')]);
    expect(store.getState().events.map((e) => e.id)).toEqual(['a', 'b']);
  });

  it('appends an event', () => {
    const store = new SchedulerStateManager();
    store.setEvents([event('a')]);
    store.addEvent(event('b'));
    expect(store.getState().events.map((e) => e.id)).toEqual(['a', 'b']);
  });

  it('replaces an event by id', () => {
    const store = new SchedulerStateManager();
    store.setEvents([event('a', { title: 'Before' }), event('b')]);

    store.updateEvent(event('a', { title: 'After' }));

    expect(store.getState().events.find((e) => e.id === 'a')!.title).toBe('After');
  });

  it('removes an event by id', () => {
    const store = new SchedulerStateManager();
    store.setEvents([event('a'), event('b')]);

    store.removeEvent('a');

    expect(store.getState().events.map((e) => e.id)).toEqual(['b']);
  });

  it('ignores a removal for an id it does not hold', () => {
    const store = new SchedulerStateManager();
    store.setEvents([event('a')]);
    store.removeEvent('ghost');
    expect(store.getState().events).toHaveLength(1);
  });

  /*
   * The selection holds an event OBJECT, not an id, so an update has to carry
   * it forward. Leaving it behind left every reader of `selectedEvent` on a
   * stale copy: reopening the editor showed the pre-edit values, and a consumer
   * with a two-way binding was handed the data it had just replaced.
   */
  it('carries the selection forward when the selected event is updated', () => {
    const store = new SchedulerStateManager();
    store.setEvents([event('a', { title: 'Before' })]);
    store.setSelectedEvent(store.getState().events[0]);

    store.updateEvent(event('a', { title: 'After' }));

    expect(store.getState().selectedEvent!.title).toBe('After');
  });

  it('leaves a selection of a different event alone', () => {
    const store = new SchedulerStateManager();
    store.setEvents([event('a'), event('b', { title: 'B' })]);
    store.setSelectedEvent(store.getState().events[1]);

    store.updateEvent(event('a', { title: 'After' }));

    expect(store.getState().selectedEvent!.id).toBe('b');
  });
});

describe('SchedulerStateManager — events authored under resources', () => {
  const nested = () =>
    [
      { ...resource('r1'), events: [event('nested-1')] },
      resource('r2'),
    ] as unknown as (Resource | ResourceGroup)[];

  // One store, so a timeline-created event is not invisible in the other views.
  it('merges events nested under a resource into the single list', () => {
    const store = new SchedulerStateManager();
    store.setResources(nested());
    store.setEvents([event('flat-1')]);

    expect(store.getState().events.map((e) => e.id).sort()).toEqual(['flat-1', 'nested-1']);
  });

  it('re-merges when the resources are replaced', () => {
    const store = new SchedulerStateManager();
    store.setEvents([event('flat-1')]);

    store.setResources(nested());

    expect(store.getState().events.map((e) => e.id)).toContain('nested-1');
  });

  it('keeps the flat events across a resource change', () => {
    const store = new SchedulerStateManager();
    store.setEvents([event('flat-1')]);

    store.setResources(nested());
    store.setResources([resource('r9')]);

    expect(store.getState().events.map((e) => e.id)).toEqual(['flat-1']);
  });

  // Removing a nested event through the public API used to filter the flat list
  // only, so the event kept rendering.
  it('removes a nested event as readily as a flat one', () => {
    const store = new SchedulerStateManager();
    store.setResources(nested());

    store.removeEvent('nested-1');

    expect(store.getState().events.map((e) => e.id)).not.toContain('nested-1');
  });
});

describe('SchedulerStateManager — the derived indexes', () => {
  it('indexes resources by id', () => {
    const store = new SchedulerStateManager();
    store.setResources([resource('r1'), resource('r2')]);
    expect([...store.getState().resourceById!.keys()].sort()).toEqual(['r1', 'r2']);
  });

  it('buckets events by resource', () => {
    const store = new SchedulerStateManager();
    store.setResources([resource('r1'), resource('r2')]);
    store.setEvents([event('a', { resourceId: 'r1' }), event('b', { resourceId: 'r1' })]);

    expect(store.getState().eventsByResource!.get('r1')).toHaveLength(2);
  });

  // Rebuilding on identity, not on every write, is what keeps a drag — which
  // touches the preview on every animation frame — from re-indexing everything.
  it('keeps the same index when nothing it derives from changed', () => {
    const store = new SchedulerStateManager();
    store.setEvents([event('a')]);
    const before = store.getState().eventsByResource;

    store.setHoveredSlot(slot(9));

    expect(store.getState().eventsByResource).toBe(before);
  });

  it('rebuilds when the events change', () => {
    const store = new SchedulerStateManager();
    store.setEvents([event('a')]);
    const before = store.getState().eventsByResource;

    store.addEvent(event('b'));

    expect(store.getState().eventsByResource).not.toBe(before);
  });

  /*
   * The event index depends on the RESOURCE index, because it buckets events
   * whose resource id no longer resolves. So deleting a resource has to rebuild
   * it even though not one event was written — the case a naive
   * "rebuild when events change" check misses entirely.
   */
  it('rebuilds the event index when only the resources changed', () => {
    const store = new SchedulerStateManager();
    store.setResources([resource('r1')]);
    store.setEvents([event('a', { resourceId: 'r1' })]);
    const before = store.getState().eventsByResource;

    store.setResources([]);

    expect(store.getState().eventsByResource).not.toBe(before);
  });
});

describe('SchedulerStateManager — resource groups', () => {
  it('honours a group authored as collapsed', () => {
    const store = new SchedulerStateManager();
    store.setResources([group('g1', [resource('r1')], true)]);
    expect(store.getState().collapsedGroups.has('g1')).toBe(true);
  });

  it('leaves a group with no flag expanded', () => {
    const store = new SchedulerStateManager();
    store.setResources([group('g1', [resource('r1')])]);
    expect(store.getState().collapsedGroups.has('g1')).toBe(false);
  });

  it('toggles a group both ways', () => {
    const store = new SchedulerStateManager();
    store.setResources([group('g1', [resource('r1')])]);

    store.toggleGroupCollapse('g1');
    expect(store.getState().collapsedGroups.has('g1')).toBe(true);

    store.toggleGroupCollapse('g1');
    expect(store.getState().collapsedGroups.has('g1')).toBe(false);
  });

  // The authored flag is a STARTING state, not a standing instruction: re-seeding
  // it on every resource write would slam a group shut under a user who had just
  // opened it.
  it('does not re-seed a group the user has since opened', () => {
    const store = new SchedulerStateManager();
    const resources = [group('g1', [resource('r1')], true)];
    store.setResources(resources);
    store.toggleGroupCollapse('g1');

    store.setResources([group('g1', [resource('r1'), resource('r2')], true)]);

    expect(store.getState().collapsedGroups.has('g1')).toBe(false);
  });
});

describe('SchedulerStateManager — navigation', () => {
  const dateOf = (store: SchedulerStateManager) => store.getState().date;

  function at(view: 'day' | 'week' | 'month' | 'year' | 'timeline'): SchedulerStateManager {
    const store = new SchedulerStateManager();
    store.setView(view);
    store.gotoDate(new Date(2026, 5, 15));
    return store;
  }

  it.each([
    ['day', 1],
    ['week', 7],
    ['timeline', 7],
  ] as const)('steps %s forward by %i days', (view, days) => {
    const store = at(view);
    const before = dateOf(store).getTime();

    store.next();

    expect((dateOf(store).getTime() - before) / 86_400_000).toBeCloseTo(days, 5);
  });

  it('steps a month forward by a month, not by 30 days', () => {
    const store = at('month');
    store.next();
    expect(dateOf(store).getMonth()).toBe(6);
    expect(dateOf(store).getDate()).toBe(15);
  });

  it('steps a year forward by a year', () => {
    const store = at('year');
    store.next();
    expect(dateOf(store).getFullYear()).toBe(2027);
  });

  it.each(['day', 'week', 'month', 'year', 'timeline'] as const)(
    'undoes a step in %s by stepping back',
    (view) => {
      const store = at(view);
      const before = dateOf(store).getTime();

      store.next();
      store.prev();

      expect(dateOf(store).getTime()).toBe(before);
    },
  );

  it('jumps to a given date', () => {
    const store = at('week');
    const target = new Date(2027, 2, 3);

    store.gotoDate(target);

    expect(dateOf(store).getTime()).toBe(target.getTime());
  });

  it('jumps to today', () => {
    const store = at('week');
    store.today();
    expect(Math.abs(dateOf(store).getTime() - Date.now())).toBeLessThan(5_000);
  });

  it('changes the view without moving the date', () => {
    const store = at('week');
    const before = dateOf(store).getTime();

    store.setView('month');

    expect(store.getState().view).toBe('month');
    expect(dateOf(store).getTime()).toBe(before);
  });

  it('does not mutate the date it navigated from', () => {
    const store = at('week');
    const held = dateOf(store);
    const heldTime = held.getTime();

    store.next();

    expect(held.getTime()).toBe(heldTime);
  });
});

describe('SchedulerStateManager — subscribers', () => {
  it('notifies on a change', () => {
    const store = new SchedulerStateManager();
    const listener = vi.fn();
    store.subscribe(listener);

    store.setLoading(true);

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('hands the listener the new state', () => {
    const store = new SchedulerStateManager();
    const seen: boolean[] = [];
    store.subscribe((state) => seen.push(state.isLoading));

    store.setLoading(true);

    expect(seen).toEqual([true]);
  });

  it('stops notifying after unsubscribe', () => {
    const store = new SchedulerStateManager();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    unsubscribe();
    store.setLoading(true);

    expect(listener).not.toHaveBeenCalled();
  });

  it('notifies every subscriber', () => {
    const store = new SchedulerStateManager();
    const first = vi.fn();
    const second = vi.fn();
    store.subscribe(first);
    store.subscribe(second);

    store.setLoading(true);

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });
});

describe('SchedulerStateManager — transient interaction state', () => {
  it('holds and clears the hovered slot', () => {
    const store = new SchedulerStateManager();
    store.setHoveredSlot(slot(9));
    expect(store.getState().hoveredSlot).not.toBeNull();

    store.setHoveredSlot(null);
    expect(store.getState().hoveredSlot).toBeNull();
  });

  it('holds and clears the hovered event', () => {
    const store = new SchedulerStateManager();
    store.setHoveredEvent(event('a'));
    expect(store.getState().hoveredEvent!.id).toBe('a');

    store.setHoveredEvent(null);
    expect(store.getState().hoveredEvent).toBeNull();
  });

  it('tracks the pointer being down', () => {
    const store = new SchedulerStateManager();
    store.setMouseDown(true);
    expect(store.getState().isMouseDown).toBe(true);
  });

  it('tracks loading', () => {
    const store = new SchedulerStateManager();
    store.setLoading(true);
    expect(store.getState().isLoading).toBe(true);
  });

  it('merges option changes rather than replacing the set', () => {
    const store = new SchedulerStateManager({ locale: 'nl-BE' });

    store.setOptions({ slotDuration: 900 });

    expect(store.getState().options.locale).toBe('nl-BE');
    expect(store.getState().options.slotDuration).toBe(900);
  });

  // A range is an anchor and an extent, not a list of cells: the cells between
  // them are derived at render time, so a resize of the view cannot leave the
  // selection describing slots that no longer exist.
  it('anchors a range at the cell focus was on when it began', () => {
    const store = new SchedulerStateManager();
    store.setFocusedCell(slot(9));

    store.extendSelection(slot(11));

    expect(store.getState().selectionAnchor!.start.getHours()).toBe(9);
    expect(store.getState().selectionExtent!.start.getHours()).toBe(11);
  });

  it('moves only the extent as the range grows', () => {
    const store = new SchedulerStateManager();
    store.setFocusedCell(slot(9));
    store.extendSelection(slot(10));

    store.extendSelection(slot(12));

    expect(store.getState().selectionAnchor!.start.getHours()).toBe(9);
    expect(store.getState().selectionExtent!.start.getHours()).toBe(12);
  });

  it('anchors on the extent itself when nothing had focus', () => {
    const store = new SchedulerStateManager();
    store.extendSelection(slot(10));
    expect(store.getState().selectionAnchor!.start.getHours()).toBe(10);
  });

  it('pins the range to one resource row', () => {
    const store = new SchedulerStateManager();
    store.setFocusedCell(slot(9), 'r1');

    store.extendSelection(slot(10), 'r2');

    expect(store.getState().selectionResourceId).toBe('r1');
  });

  // Arrow navigation drops any range the user had built; only Shift keeps it,
  // and that is the caller's decision, expressed by the flag.
  it('drops the range when focus moves without asking to keep it', () => {
    const store = new SchedulerStateManager();
    store.setFocusedCell(slot(9));
    store.extendSelection(slot(10));

    store.setFocusedCell(slot(11));

    expect(store.getState().selectionAnchor).toBeNull();
    expect(store.getState().selectionExtent).toBeNull();
  });

  it('keeps the range when focus moves with it held', () => {
    const store = new SchedulerStateManager();
    store.setFocusedCell(slot(9));
    store.extendSelection(slot(10));

    store.setFocusedCell(slot(11), null, false);

    expect(store.getState().selectionAnchor).not.toBeNull();
    expect(store.getState().selectionExtent).not.toBeNull();
  });

  // Clearing the range leaves the focused cell alone — the user is still
  // standing somewhere, they have just stopped selecting.
  it('clears the range without moving focus', () => {
    const store = new SchedulerStateManager();
    store.setFocusedCell(slot(9));
    store.extendSelection(slot(10));

    store.clearSelection();

    expect(store.getState().selectionAnchor).toBeNull();
    expect(store.getState().focusedCell).not.toBeNull();
  });
});
