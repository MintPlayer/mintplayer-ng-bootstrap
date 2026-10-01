import { afterEach, describe, expect, it, vi } from 'vitest';
import './mp-scheduler';
import type { MpScheduler } from './mp-scheduler';
import type { SchedulerEvent } from '@mintplayer/web-components/scheduler-core';

/**
 * The public surface of <mp-scheduler>: properties, attributes, navigation and
 * mutation methods, and the pointer drag pipeline end to end.
 *
 * The pointer specs drive real mouse/touch events through the InputHandler and
 * the DragManager. jsdom has no hit-testing, so the one thing stubbed is the
 * element's private `elementsAt(x, y)` seam: it answers "which elements are
 * under this point" with REAL rendered slot elements (PRD test-coverage P2-D4).
 * No rect or offset value is invented anywhere.
 */

type Internals = {
  elementsAt: (x: number, y: number) => Element[];
  stateManager: {
    getState: () => {
      previewEvent: { start: Date; end: Date } | null;
      dragState: unknown;
      selectedEvent: SchedulerEvent | null;
      events: SchedulerEvent[];
      date: Date;
      view: string;
      options: Record<string, unknown>;
    };
  };
  dragManager: { getPhase: () => string };
  updateComplete: Promise<void>;
};

const internals = (el: MpScheduler) => el as unknown as Internals;

async function nextRaf(): Promise<void> {
  return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
}

async function settle(el: MpScheduler): Promise<void> {
  await internals(el).updateComplete;
  await nextRaf();
}

let el: MpScheduler;

afterEach(() => {
  el?.remove();
  vi.useRealTimers();
});

async function mount(
  view: 'week' | 'day' | 'timeline' | 'month' | 'year' = 'week',
  setup: (el: MpScheduler) => void = () => undefined,
): Promise<MpScheduler> {
  el = document.createElement('mp-scheduler') as MpScheduler;
  // Pinned so dates and the week start (Sunday) are deterministic; see the
  // keyboard spec's mount() for why.
  el.setAttribute('locale', 'en-US');
  document.body.appendChild(el);
  el.date = new Date(2026, 4, 12); // Tuesday
  setup(el);
  el.setAttribute('view', view);
  await settle(el);
  return el;
}

const EV: SchedulerEvent = {
  id: 'standup',
  title: 'Standup',
  start: new Date(2026, 4, 12, 9, 0),
  end: new Date(2026, 4, 12, 10, 0),
};

function liveText(el: MpScheduler): string {
  return el.shadowRoot!.querySelector('[role="status"][aria-live]')?.textContent ?? '';
}

function listen<T = unknown>(el: MpScheduler, type: string): CustomEvent<T>[] {
  const seen: CustomEvent<T>[] = [];
  el.addEventListener(type, (e) => seen.push(e as CustomEvent<T>));
  return seen;
}

function key(el: MpScheduler, k: string, init: KeyboardEventInit = {}): void {
  el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, ...init }));
}

describe('mp-scheduler API — view and date', () => {
  it('the view and date properties read and write the same state', async () => {
    await mount('week');
    el.view = 'month';
    el.date = new Date(2026, 6, 4);
    await settle(el);
    expect(el.view).toBe('month');
    expect(el.date).toEqual(new Date(2026, 6, 4));
    expect(el.shadowRoot!.querySelector('.scheduler-month-view, .scheduler-month-cell')).not.toBeNull();
  });

  it('a view or date change fires one view-change carrying both', async () => {
    await mount('week');
    const seen = listen<{ view: string; date: Date }>(el, 'view-change');
    el.changeView('day');
    await settle(el);
    expect(seen).toHaveLength(1);
    expect(seen[0].detail.view).toBe('day');
    expect(seen[0].detail.date).toEqual(new Date(2026, 4, 12));
  });

  it('changeView announces the localized view name', async () => {
    await mount('week');
    el.changeView('month');
    await settle(el);
    expect(liveText(el)).toBe('View changed to Month.');
  });

  it.each([
    ['year', new Date(2027, 4, 12), new Date(2025, 4, 12)],
    ['month', new Date(2026, 5, 12), new Date(2026, 3, 12)],
    ['week', new Date(2026, 4, 19), new Date(2026, 4, 5)],
    ['timeline', new Date(2026, 4, 19), new Date(2026, 4, 5)],
    ['day', new Date(2026, 4, 13), new Date(2026, 4, 11)],
  ] as const)('next/prev in %s view step one period', async (view, afterNext, afterPrev) => {
    await mount(view);
    el.next();
    expect(el.date).toEqual(afterNext);
    el.prev();
    el.prev();
    expect(el.date).toEqual(afterPrev);
  });

  it('today() jumps to the current date and gotoDate() to any date', async () => {
    await mount('week');
    el.gotoDate(new Date(2030, 0, 1));
    expect(el.date).toEqual(new Date(2030, 0, 1));
    const before = Date.now();
    el.today();
    expect(Math.abs(el.date.getTime() - before)).toBeLessThan(5000);
  });
});

describe('mp-scheduler API — attributes', () => {
  it('the date attribute sets the date', async () => {
    await mount('week');
    el.setAttribute('date', '2026-08-01T00:00:00');
    expect(el.date).toEqual(new Date(2026, 7, 1));
  });

  it('an unknown view attribute value is ignored', async () => {
    await mount('week');
    el.setAttribute('view', 'fortnight');
    expect(el.view).toBe('week');
  });

  it('first-day-of-week accepts 0-7, folding the Intl Sunday (7) onto 0, and ignores the rest', async () => {
    await mount('week');
    el.setAttribute('first-day-of-week', '1');
    expect(el.options.firstDayOfWeek).toBe(1);
    el.setAttribute('first-day-of-week', '7');
    expect(el.options.firstDayOfWeek).toBe(0);
    el.setAttribute('first-day-of-week', '9');
    expect(el.options.firstDayOfWeek).toBe(0);
    el.setAttribute('first-day-of-week', 'monday');
    expect(el.options.firstDayOfWeek).toBe(0);
  });

  it('slot-duration sets the slot length, and the grid re-renders with it', async () => {
    await mount('day');
    const before = el.shadowRoot!.querySelectorAll('.scheduler-time-slot').length;
    el.setAttribute('slot-duration', '3600');
    await settle(el);
    expect(el.options.slotDuration).toBe(3600);
    expect(el.shadowRoot!.querySelectorAll('.scheduler-time-slot').length).toBe(before / 2);
  });

  it('time-format accepts 12h and 24h only', async () => {
    await mount('week');
    el.setAttribute('time-format', '12h');
    expect(el.options.timeFormat).toBe('12h');
    el.setAttribute('time-format', 'metric');
    expect(el.options.timeFormat).toBe('12h');
  });

  it('removing an attribute keeps the last value rather than resetting it', async () => {
    await mount('week');
    el.setAttribute('locale', 'nl-BE');
    el.removeAttribute('locale');
    expect(el.options.locale).toBe('nl-BE');
  });

  it('readonly property and attribute are one state, and readonly="false" opts out', async () => {
    await mount('week');
    expect(el.readonly).toBe(false);
    el.readonly = true;
    expect(el.hasAttribute('readonly')).toBe(true);
    expect(el.readonly).toBe(true);
    el.setAttribute('readonly', 'false');
    expect(el.readonly).toBe(false);
    el.readonly = false;
    expect(el.hasAttribute('readonly')).toBe(false);
  });

  it('the event-editor attribute outranks options.eventEditor', async () => {
    await mount('week');
    expect(el.eventEditor).toBe(true);
    el.options = { eventEditor: false };
    expect(el.eventEditor).toBe(false);
    el.eventEditor = true;
    expect(el.getAttribute('event-editor')).toBe('true');
    expect(el.eventEditor).toBe(true);
    el.eventEditor = false;
    expect(el.getAttribute('event-editor')).toBe('false');
    expect(el.eventEditor).toBe(false);
  });

  it('options merge rather than replace', async () => {
    await mount('week');
    el.options = { slotDuration: 900 };
    el.options = { timeFormat: '12h' };
    expect(el.options.slotDuration).toBe(900);
    expect(el.options.timeFormat).toBe('12h');
  });
});

describe('mp-scheduler API — events', () => {
  it('addEvent, updateEvent and removeEvent change the store and are announced', async () => {
    await mount('week');
    el.addEvent(EV);
    await settle(el);
    expect(el.getEventById('standup')).toEqual(EV);
    expect(liveText(el)).toBe('Event Standup added.');

    el.updateEvent({ ...EV, title: 'Retro' });
    await settle(el);
    expect(el.getEventById('standup')?.title).toBe('Retro');
    expect(liveText(el)).toBe('Event Retro updated.');

    el.removeEvent('standup');
    await settle(el);
    expect(el.getEventById('standup')).toBeNull();
    expect(liveText(el)).toBe('Event Retro removed.');
  });

  it('removing an unknown event announces nothing', async () => {
    await mount('week');
    el.removeEvent('nope');
    await settle(el);
    expect(liveText(el)).toBe('');
  });

  it('the events and resources properties read back what was set', async () => {
    await mount('timeline');
    el.events = [EV];
    el.resources = [{ id: 'alice', title: 'Alice' }];
    expect(el.events.map((e) => e.id)).toEqual(['standup']);
    expect(el.resources.map((r) => r.id)).toEqual(['alice']);
  });

  it('selectedEvent reads and writes the selection, and fires selection-change', async () => {
    await mount('week', (e) => (e.events = [EV]));
    const seen = listen<{ selectedEvent: SchedulerEvent | null }>(el, 'selection-change');
    el.selectedEvent = EV;
    expect(el.selectedEvent).toEqual(EV);
    expect(seen.at(-1)!.detail.selectedEvent).toEqual(EV);
  });

  it('refetchEvents redraws the view from the current events', async () => {
    const mutable = { ...EV };
    await mount('week', (e) => (e.events = [mutable]));
    mutable.title = 'Renamed in place';
    el.refetchEvents();
    const box = el.shadowRoot!.querySelector<HTMLElement>('.scheduler-event[data-event-id="standup"]');
    expect(box?.textContent).toContain('Renamed in place');
  });
});

describe('mp-scheduler API — selectedRange (bug: it returned the drag preview)', () => {
  const focusSlot = (dayIndex: number, slotIndex: number) =>
    el.shadowRoot!
      .querySelector<HTMLElement>(
        `.scheduler-time-slot[data-day-index="${dayIndex}"][data-slot-index="${slotIndex}"]`,
      )!
      .focus();

  it('is null with no selection', async () => {
    await mount('week');
    expect(el.selectedRange).toBeNull();
  });

  it('reports the keyboard selection, the same range selection-change carries', async () => {
    await mount('week');
    const seen = listen<{ range: { start: Date; end: Date } | null }>(el, 'selection-change');
    focusSlot(2, 18); // Tue 09:00
    key(el, 'ArrowDown');
    key(el, 'ArrowDown', { shiftKey: true });
    key(el, 'ArrowDown', { shiftKey: true });
    await settle(el);
    expect(el.selectedRange).toEqual({
      start: new Date(2026, 4, 12, 9, 30),
      end: new Date(2026, 4, 12, 11, 0),
    });
    expect(seen.at(-1)!.detail.range).toMatchObject(el.selectedRange!);
  });

  it('is not the move-mode preview, which is no selection at all', async () => {
    await mount('week', (e) => (e.events = [EV]));
    el.shadowRoot!.querySelector<HTMLElement>('.scheduler-event[data-event-id="standup"]')!.focus();
    await nextRaf();
    key(el, 'Enter'); // move-mode: the preview becomes the event's working copy
    key(el, 'ArrowDown');
    await settle(el);
    expect(internals(el).stateManager.getState().previewEvent).not.toBeNull();
    expect(el.selectedRange).toBeNull();
  });

  it('clearSelection empties it', async () => {
    await mount('week');
    focusSlot(2, 18);
    key(el, 'ArrowDown');
    key(el, 'ArrowDown', { shiftKey: true });
    el.clearSelection();
    expect(el.selectedRange).toBeNull();
  });
});

describe('mp-scheduler API — lifecycle (bug: a moved scheduler was empty and undraggable)', () => {
  it('re-attaching the element redraws its grid', async () => {
    await mount('week', (e) => (e.events = [EV]));
    el.remove();
    document.body.appendChild(el);
    await settle(el);
    expect(el.shadowRoot!.querySelectorAll('.scheduler-time-slot').length).toBeGreaterThan(0);
    expect(el.shadowRoot!.querySelector('.scheduler-event[data-event-id="standup"]')).not.toBeNull();
  });

  it('re-attaching the element re-arms pointer drags', async () => {
    await mount('week', (e) => (e.events = [EV]));
    el.remove();
    document.body.appendChild(el);
    await settle(el);
    hitTestByY();
    const updates = listen<{ event: SchedulerEvent }>(el, 'event-update');
    const box = el.shadowRoot!.querySelector<HTMLElement>('.scheduler-event[data-event-id="standup"]')!;
    await drag(box, 18, 20);
    expect(updates).toHaveLength(1);
    expect(updates[0].detail.event.start).toEqual(new Date(2026, 4, 12, 10, 0));
  });
});

// ---------------------------------------------------------------------------
// Pointer drag completion, end to end through the hit-test seam.
// ---------------------------------------------------------------------------

/** The week-view slot element for Tuesday (day 2) at slot index `i`. */
const tuesdaySlot = (i: number) =>
  el.shadowRoot!.querySelector<HTMLElement>(
    `.scheduler-time-slot[data-day-index="2"][data-slot-index="${i}"]`,
  )!;

/**
 * Map a pointer's y onto Tuesday's slots, 10px per slot, with a non-slot
 * element on top the way a real hit-test returns the event box first.
 */
function hitTestByY(): void {
  internals(el).elementsAt = (_x, y) => {
    const slot = tuesdaySlot(Math.floor(y / 10));
    const cover = el.shadowRoot!.querySelector('.scheduler-content')!;
    return slot ? [cover, slot] : [cover];
  };
}

function mouseAt(type: string, target: EventTarget, y: number): void {
  target.dispatchEvent(
    new MouseEvent(type, { bubbles: true, composed: true, cancelable: true, clientX: 5, clientY: y }),
  );
}

/** Press on `target` at slot `from`, drag to slot `to`, release. */
async function drag(target: HTMLElement, from: number, to: number): Promise<void> {
  mouseAt('mousedown', target, from * 10);
  mouseAt('mousemove', document, to * 10);
  await nextRaf();
  mouseAt('mouseup', document, to * 10);
  await settle(el);
}

describe('mp-scheduler — pointer drag completion', () => {
  it('a move-drag commits the shifted event and requests it with event-update', async () => {
    await mount('week', (e) => (e.events = [EV]));
    hitTestByY();
    const updates = listen<{ event: SchedulerEvent; oldEvent: SchedulerEvent }>(el, 'event-update');
    const box = el.shadowRoot!.querySelector<HTMLElement>('.scheduler-event[data-event-id="standup"]')!;
    await drag(box, 18, 22); // 09:00 -> 11:00

    expect(updates).toHaveLength(1);
    expect(updates[0].detail.event.start).toEqual(new Date(2026, 4, 12, 11, 0));
    expect(updates[0].detail.event.end).toEqual(new Date(2026, 4, 12, 12, 0));
    expect(updates[0].detail.oldEvent.start).toEqual(EV.start);
    expect(el.getEventById('standup')!.start).toEqual(new Date(2026, 4, 12, 11, 0));
    expect(internals(el).dragManager.getPhase()).toBe('idle');
  });

  it('an end-edge resize keeps the start and moves the end', async () => {
    await mount('week', (e) => (e.events = [EV]));
    hitTestByY();
    const updates = listen<{ event: SchedulerEvent }>(el, 'event-update');
    const handle = el.shadowRoot!.querySelector<HTMLElement>(
      '.scheduler-event[data-event-id="standup"] .resize-handle[data-handle="end"]',
    )!;
    await drag(handle, 19, 23);
    expect(updates[0].detail.event.start).toEqual(EV.start);
    expect(updates[0].detail.event.end).toEqual(new Date(2026, 4, 12, 12, 0));
  });

  it('a create-drag across slots requests the range without adding anything', async () => {
    await mount('week');
    hitTestByY();
    const creates = listen<{ range: { start: Date; end: Date }; view: string; resourceId?: string }>(
      el,
      'event-create',
    );
    await drag(tuesdaySlot(20), 20, 23); // 10:00 through 12:00
    expect(creates).toHaveLength(1);
    expect(creates[0].detail.range).toEqual({
      start: new Date(2026, 4, 12, 10, 0),
      end: new Date(2026, 4, 12, 12, 0),
    });
    expect(creates[0].detail.view).toBe('week');
    expect(creates[0].detail.resourceId).toBeUndefined();
    expect(el.events).toHaveLength(0);
  });

  it('a press and release without movement selects the event, and a second one is a double-click', async () => {
    await mount('week', (e) => (e.events = [EV]));
    hitTestByY();
    const selected = listen(el, 'event-selected');
    const dbl = listen(el, 'event-dblclick');
    const press = async () => {
      const box = el.shadowRoot!.querySelector<HTMLElement>('.scheduler-event[data-event-id="standup"]')!;
      mouseAt('mousedown', box, 180);
      mouseAt('mouseup', document, 180);
      await settle(el);
    };
    await press();
    expect(selected).toHaveLength(1);
    expect(el.selectedEvent?.id).toBe('standup');
    expect(dbl).toHaveLength(0);
    await press();
    expect(dbl).toHaveLength(1);
  });

  it('a drag that ends over no slot keeps the last resolved slot', async () => {
    await mount('week', (e) => (e.events = [EV]));
    hitTestByY();
    const updates = listen<{ event: SchedulerEvent }>(el, 'event-update');
    const box = el.shadowRoot!.querySelector<HTMLElement>('.scheduler-event[data-event-id="standup"]')!;
    mouseAt('mousedown', box, 180);
    mouseAt('mousemove', document, 200);
    await nextRaf();
    mouseAt('mousemove', document, 99999); // off the grid: no slot there
    await nextRaf();
    mouseAt('mouseup', document, 99999);
    await settle(el);
    expect(updates[0].detail.event.start).toEqual(new Date(2026, 4, 12, 10, 0));
  });

  it('a drag held against the scroller keeps auto-scrolling, and the release stops it', async () => {
    await mount('week', (e) => (e.events = [EV]));
    hitTestByY();
    const content = el.shadowRoot!.querySelector<HTMLElement>('.scheduler-content')!;
    const box = el.shadowRoot!.querySelector<HTMLElement>('.scheduler-event[data-event-id="standup"]')!;
    mouseAt('mousedown', box, 180);
    mouseAt('mousemove', document, 220);
    await nextRaf();
    const first = content.scrollTop;
    await nextRaf();
    expect(content.scrollTop).not.toBe(first);

    mouseAt('mouseup', document, 220);
    await settle(el);
    const settled = content.scrollTop;
    await nextRaf();
    expect(content.scrollTop).toBe(settled);
  });
});

describe('mp-scheduler — timeline drag across rows', () => {
  const ASSIGNED: SchedulerEvent = { ...EV, id: 'task', resourceId: 'alice' };
  const LOOSE: SchedulerEvent = {
    id: 'loose',
    title: 'Loose',
    start: new Date(2026, 4, 12, 14, 0),
    end: new Date(2026, 4, 12, 15, 0),
  };

  const mountTimeline = () =>
    mount('timeline', (e) => {
      e.resources = [
        { id: 'alice', title: 'Alice' },
        { id: 'bob', title: 'Bob' },
      ];
      e.events = [ASSIGNED, LOOSE];
    });

  /** The slot that starts at 09:00 on Tuesday in the row matching `rowSelector`. */
  const rowSlot = (rowSelector: string) =>
    Array.from(
      el.shadowRoot!.querySelectorAll<HTMLElement>(`.scheduler-timeline-slot${rowSelector}`),
    ).find((s) => new Date(s.dataset['start']!).getTime() === ASSIGNED.start.getTime())!;

  const dragTaskTo = async (target: HTMLElement) => {
    const source = rowSlot('[data-resource-id="alice"]');
    internals(el).elementsAt = (_x, y) => [y < 50 ? source : target];
    const box = el.shadowRoot!.querySelector<HTMLElement>('.scheduler-timeline-event[data-event-id="task"]')!;
    mouseAt('mousedown', box, 10);
    mouseAt('mousemove', document, 100);
    await nextRaf();
    mouseAt('mouseup', document, 100);
    await settle(el);
  };

  it('dropping on another row reassigns the event to that resource', async () => {
    await mountTimeline();
    const updates = listen<{ event: SchedulerEvent }>(el, 'event-update');
    await dragTaskTo(rowSlot('[data-resource-id="bob"]'));
    expect(updates[0].detail.event.resourceId).toBe('bob');
    expect(el.getEventById('task')!.resourceId).toBe('bob');
  });

  it('dropping on the unassigned row removes the resource altogether', async () => {
    await mountTimeline();
    const updates = listen<{ event: SchedulerEvent }>(el, 'event-update');
    await dragTaskTo(rowSlot('[data-unassigned]'));
    expect('resourceId' in updates[0].detail.event).toBe(false);
  });
});

describe('mp-scheduler — touch drag cancelled by the platform', () => {
  it('abandons the drag instead of committing it', async () => {
    await mount('week', (e) => (e.events = [EV]));
    hitTestByY();
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const updates = listen(el, 'event-update');
    const box = el.shadowRoot!.querySelector<HTMLElement>('.scheduler-event[data-event-id="standup"]')!;
    const point = { identifier: 0, target: box, clientX: 5, clientY: 180 } as unknown as Touch;
    const fire = (type: string, touches: Touch[]) =>
      box.dispatchEvent(
        new TouchEvent(type, {
          bubbles: true,
          composed: true,
          cancelable: true,
          touches,
          targetTouches: touches,
          changedTouches: [point],
        }),
      );
    fire('touchstart', [point]);
    vi.advanceTimersByTime(600);
    expect(internals(el).dragManager.getPhase()).toBe('active');
    expect(internals(el).stateManager.getState().previewEvent).not.toBeNull();

    fire('touchcancel', []);
    vi.useRealTimers();
    await settle(el);
    expect(internals(el).dragManager.getPhase()).toBe('idle');
    expect(internals(el).stateManager.getState().previewEvent).toBeNull();
    expect(updates).toHaveLength(0);
  });
});

describe('mp-scheduler — clicks, taps and double-clicks', () => {
  const touchTap = (target: HTMLElement) => {
    const point = { identifier: 0, target, clientX: 5, clientY: 180 } as unknown as Touch;
    const fire = (type: string, touches: Touch[]) =>
      target.dispatchEvent(
        new TouchEvent(type, {
          bubbles: true,
          composed: true,
          cancelable: true,
          touches,
          targetTouches: touches,
          changedTouches: [point],
        }),
      );
    fire('touchstart', [point]);
    fire('touchend', []);
  };

  it('a native double-click on an event fires event-dblclick and opens the editor', async () => {
    await mount('week', (e) => (e.events = [EV]));
    const dbl = listen<{ event: SchedulerEvent }>(el, 'event-dblclick');
    const box = el.shadowRoot!.querySelector<HTMLElement>('.scheduler-event[data-event-id="standup"]')!;
    box.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, composed: true }));
    await settle(el);
    expect(dbl).toHaveLength(1);
    expect(dbl[0].detail.event.id).toBe('standup');
    expect(el.shadowRoot!.querySelector('.scheduler-event-editor')).not.toBeNull();
  });

  it('a touch tap on an event selects it, and a quick second tap is a double-tap', async () => {
    await mount('week', (e) => (e.events = [EV]));
    hitTestByY();
    const dbl = listen(el, 'event-dblclick');
    touchTap(el.shadowRoot!.querySelector<HTMLElement>('.scheduler-event[data-event-id="standup"]')!);
    await settle(el);
    expect(el.selectedEvent?.id).toBe('standup');
    touchTap(el.shadowRoot!.querySelector<HTMLElement>('.scheduler-event[data-event-id="standup"]')!);
    await settle(el);
    expect(dbl).toHaveLength(1);
  });

  it('a click on a month header in year view opens that month', async () => {
    await mount('year');
    const header = Array.from(
      el.shadowRoot!.querySelectorAll<HTMLElement>('.scheduler-year-month-header'),
    ).find((h) => new Date(h.dataset['month']!).getMonth() === 9)!;
    header.click();
    await settle(el);
    expect(el.view).toBe('month');
    expect(el.date.getMonth()).toBe(9);
  });

  it('a "+N more" link hands the day and its events to a function moreLinkBehavior', async () => {
    const busy = Array.from({ length: 6 }, (_, i) => ({
      id: `e${i}`,
      title: `E${i}`,
      start: new Date(2026, 4, 12, 8 + i),
      end: new Date(2026, 4, 12, 8 + i, 30),
    }));
    const calls: { date: Date; events: SchedulerEvent[] }[] = [];
    await mount('month', (e) => {
      e.events = busy;
      e.options = { moreLinkBehavior: (arg: { date: Date; events: SchedulerEvent[] }) => calls.push(arg) };
    });
    el.shadowRoot!.querySelector<HTMLElement>('.scheduler-more-link')!.click();
    expect(calls).toHaveLength(1);
    expect(calls[0].date).toEqual(new Date(2026, 4, 12));
    expect(calls[0].events.map((e) => e.id)).toEqual(busy.map((e) => e.id));
    expect(el.view).toBe('month');
  });

  it('moving the mouse with no drag in progress never scrolls the grid', async () => {
    await mount('week');
    const content = el.shadowRoot!.querySelector<HTMLElement>('.scheduler-content')!;
    const before = content.scrollTop;
    mouseAt('mousemove', document, 5000);
    await nextRaf();
    expect(content.scrollTop).toBe(before);
  });
});
