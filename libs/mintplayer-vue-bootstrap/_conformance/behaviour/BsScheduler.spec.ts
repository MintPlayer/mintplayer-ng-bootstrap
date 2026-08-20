import { describe, expect, it } from 'vitest';

import BsScheduler from '../../scheduler/src/BsScheduler.vue';
import type { MpScheduler } from '@mintplayer/web-components/scheduler';

import { emit, mountEl } from './harness';

/**
 * The scheduler navigates itself. Its view switcher and its prev/next/today
 * buttons both change what is displayed and report it through `view-change`,
 * so a `v-model:view` / `v-model:date` that has no write-back silently goes
 * stale the first time a user presses "next week" — the binding still holds
 * the value the app set at startup while the component shows something else.
 *
 * The other half is the `undefined` distinction inside `syncProps`. `readonly`
 * is coerced (`=== true`) because it is a coarse switch with a definite off
 * state, while `eventEditor` is only written when the consumer actually said
 * something — writing `undefined` would clobber the element's own default and
 * the `options.permissions` that refine it.
 */

const EVENTS = [{ id: '1', title: 'Standup', start: new Date(2020, 0, 1), end: new Date(2020, 0, 1) }];
const RESOURCES = [{ id: 'r1', name: 'Room 1' }];

function mountScheduler(props: Record<string, unknown> = {}) {
  return mountEl<MpScheduler>(BsScheduler, 'mp-scheduler', { props });
}

describe('BsScheduler — object props reach the element', () => {
  // Compared by value, never by identity: Vue hands a component its props
  // through a reactive Proxy, so what reaches the element is a wrapper around
  // the consumer's array rather than the array itself. That is true of every
  // object-valued prop in this library and is why an identity assertion here
  // would fail against perfectly correct code.
  it('forwards events and resources as properties', () => {
    const { el } = mountScheduler({ events: EVENTS, resources: RESOURCES });
    expect(el.events).toEqual(EVENTS);
    expect(el.resources).toEqual(RESOURCES);
  });

  // The element merges what it is given over its own defaults, so the assertion
  // is that the consumer's value survived the merge — not that the object is
  // the one that went in.
  it('forwards the options object', () => {
    const { el } = mountScheduler({ options: { locale: 'nl-BE' } });
    expect(el.options.locale).toBe('nl-BE');
  });

  // Reference-equality watching is deliberate: consumers replace the array
  // rather than mutating it, matching how Lit itself detects change.
  it('re-syncs when the events array is replaced', async () => {
    const { wrapper, el } = mountScheduler({ events: EVENTS });
    const replaced = [...EVENTS, { ...EVENTS[0], id: '2' }];

    await wrapper.setProps({ events: replaced });

    expect(el.events).toHaveLength(2);
  });

  it('coerces an unset readonly to false rather than leaving it undefined', () => {
    const { el } = mountScheduler();
    expect(el.readonly).toBe(false);
  });

  it('honours readonly when set', () => {
    const { el } = mountScheduler({ readonly: true });
    expect(el.readonly).toBe(true);
  });

  /*
   * Regression guard for a bug this milestone found. Vue casts an ABSENT
   * declared Boolean prop to `false` rather than `undefined`, so the wrapper's
   * "only write it when the consumer said something" test was true on every
   * mount and every Vue app shipped with the built-in editor switched off —
   * against its documented default, and invisibly, because an app with its own
   * editor looked identical either way.
   */
  it('leaves the built-in editor at its element default when unset', () => {
    const { el } = mountScheduler();
    expect(el.eventEditor).toBe(true);
  });

  it('turns the built-in editor off when asked', () => {
    const { el } = mountScheduler({ eventEditor: false });
    expect(el.eventEditor).toBe(false);
  });
});

describe('BsScheduler — v-model:view and v-model:date', () => {
  const DATE = new Date(2020, 5, 15);

  it('pushes the bound view and date to the element', () => {
    const { el } = mountScheduler({ view: 'week', date: DATE });
    expect(el.view).toBe('week');
    expect(el.date).toBe(DATE);
  });

  it('pushes a later view change', async () => {
    const { wrapper, el } = mountScheduler({ view: 'week' });

    await wrapper.setProps({ view: 'month' });

    expect(el.view).toBe('month');
  });

  // Both channels update from one event: the view switcher changes the view,
  // and prev/next/today changes only the date — but the element reports both
  // through the same event, so both bindings must be written.
  it('writes both channels back when the element navigates itself', async () => {
    const { wrapper, el } = mountScheduler({ view: 'week', date: DATE });
    const moved = new Date(2020, 5, 22);

    await emit(el, 'view-change', { view: 'day', date: moved });

    expect(wrapper.emitted('update:view')![0]).toEqual(['day']);
    expect(wrapper.emitted('update:date')![0]).toEqual([moved]);
  });

  it('ignores a view-change with no detail', async () => {
    const { wrapper, el } = mountScheduler({ view: 'week', date: DATE });

    await emit(el, 'view-change', undefined);

    expect(wrapper.emitted('update:view')).toBeUndefined();
  });
});
