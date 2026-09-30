import { afterEach, describe, expect, it, vi } from 'vitest';
import './mp-scheduler';
import type { MpScheduler } from './mp-scheduler';
import type { SchedulerEvent } from '@mintplayer/web-components/scheduler-core';

/**
 * View-level behaviour the other scheduler suites never reach: the day view's
 * incremental update() path, the greyed-slot and ghost feedback of a pointer
 * drag in day and week view, the now indicator and its minute tick, the
 * timeline's column resizer, and the timeline's focus restore across a rebuild.
 *
 * Drags go through the private `elementsAt(x, y)` hit-test seam with REAL slot
 * elements (PRD test-coverage P2-D4); no rect values are invented.
 */

type Internals = {
  elementsAt: (x: number, y: number) => Element[];
  stateManager: {
    getState: () => { previewEvent: unknown; dragState: unknown };
  };
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
  view: 'week' | 'day' | 'timeline',
  setup: (el: MpScheduler) => void = () => undefined,
  date = new Date(2026, 4, 12),
): Promise<MpScheduler> {
  el = document.createElement('mp-scheduler') as MpScheduler;
  el.setAttribute('locale', 'en-US');
  document.body.appendChild(el);
  el.date = date;
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

function press(type: string, target: EventTarget, y: number): void {
  target.dispatchEvent(
    new MouseEvent(type, { bubbles: true, composed: true, cancelable: true, clientX: 5, clientY: y }),
  );
}

/** Hit-test by y, 10px per slot, over the given slot elements. */
function hitTest(slots: () => HTMLElement[]): void {
  internals(el).elementsAt = (_x, y) => {
    const slot = slots()[Math.floor(y / 10)];
    return slot ? [slot] : [];
  };
}

const greyedCount = () => el.shadowRoot!.querySelectorAll('.scheduler-time-slot.greyed').length;
const ghosts = () => el.shadowRoot!.querySelectorAll<HTMLElement>('.scheduler-event.preview');

describe('day view — drag feedback through update()', () => {
  const daySlots = () =>
    Array.from(el.shadowRoot!.querySelectorAll<HTMLElement>('.scheduler-time-slot'));

  it('a create-drag greys exactly the covered slots and draws one ghost, cleared on release', async () => {
    await mount('day');
    hitTest(daySlots);
    press('mousedown', daySlots()[20], 200); // 10:00
    press('mousemove', document, 230); // 11:30
    await settle(el);

    expect(greyedCount()).toBe(4); // 10:00, 10:30, 11:00, 11:30
    expect(ghosts()).toHaveLength(1);
    expect(ghosts()[0].classList.contains('preview-continues-before')).toBe(false);

    press('mouseup', document, 230);
    await settle(el);
    expect(greyedCount()).toBe(0);
    expect(ghosts()).toHaveLength(0);
  });

  it('a move keeps the rendered events in step while the ghost tracks the pointer', async () => {
    await mount('day', (e) => (e.events = [EV]));
    hitTest(daySlots);
    const box = el.shadowRoot!.querySelector<HTMLElement>('.scheduler-event[data-event-id="standup"]')!;
    press('mousedown', box, 180);
    press('mousemove', document, 240); // +3h
    await settle(el);
    expect(el.shadowRoot!.querySelectorAll('.scheduler-event:not(.preview)')).toHaveLength(1);
    expect(ghosts()).toHaveLength(1);
    expect(greyedCount()).toBe(2); // 12:00 and 12:30
    press('mouseup', document, 240);
    await settle(el);
    expect(el.events[0].start).toEqual(new Date(2026, 4, 12, 12, 0));
  });

  it('a ghost for a range that started yesterday is clipped and marked as continuing', async () => {
    const overnight: SchedulerEvent = {
      id: 'night',
      title: 'Night shift',
      start: new Date(2026, 4, 11, 22, 0),
      end: new Date(2026, 4, 12, 6, 0),
    };
    await mount('day', (e) => (e.events = [overnight]));
    // Keyboard move-mode renders the working copy through the same ghost path.
    el.shadowRoot!.querySelector<HTMLElement>('.scheduler-event[data-event-id="night"]')!.focus();
    await nextRaf();
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await settle(el);
    expect(ghosts()).toHaveLength(1);
    expect(ghosts()[0].classList.contains('preview-continues-before')).toBe(true);
    expect(ghosts()[0].classList.contains('preview-continues-after')).toBe(false);
  });

  it('a ghost wholly on another day draws nothing on this one', async () => {
    const tomorrow: SchedulerEvent = {
      id: 'later',
      title: 'Later',
      start: new Date(2026, 4, 12, 23, 0),
      end: new Date(2026, 4, 12, 23, 30),
    };
    await mount('day', (e) => (e.events = [tomorrow]));
    el.shadowRoot!.querySelector<HTMLElement>('.scheduler-event[data-event-id="later"]')!.focus();
    await nextRaf();
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    // Two slots down from 23:00 is 00:00 tomorrow.
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await settle(el);
    expect(internals(el).stateManager.getState().previewEvent).not.toBeNull();
    expect(ghosts()).toHaveLength(0);
  });

  it('a date change rebuilds the day, a time-format change relabels it', async () => {
    await mount('day');
    const before = el.shadowRoot!.querySelector('.scheduler-day-header')!.textContent;
    el.date = new Date(2026, 4, 13);
    await settle(el);
    expect(el.shadowRoot!.querySelector('.scheduler-day-header')!.textContent).not.toBe(before);

    // en-US follows the locale (12-hour) until a format is forced.
    const label = () => el.shadowRoot!.querySelector('.scheduler-time-gutter')!.textContent;
    expect(label()).toContain('AM');
    el.setAttribute('time-format', '24h');
    await settle(el);
    expect(label()).not.toContain('AM');
    expect(label()).toContain('13:00');
  });
});

describe('week view — drag feedback across days', () => {
  it('a create-drag spanning two days greys the slots on both', async () => {
    await mount('week');
    // Tuesday 22:00 .. Wednesday 01:30, via a hit list crossing the midnight.
    const tue = (i: number) =>
      el.shadowRoot!.querySelector<HTMLElement>(`.scheduler-time-slot[data-day-index="2"][data-slot-index="${i}"]`)!;
    const wed = (i: number) =>
      el.shadowRoot!.querySelector<HTMLElement>(`.scheduler-time-slot[data-day-index="3"][data-slot-index="${i}"]`)!;
    internals(el).elementsAt = (_x, y) => [y < 100 ? tue(44) : wed(3)];
    press('mousedown', tue(44), 0);
    press('mousemove', document, 200);
    await settle(el);
    const greyed = Array.from(el.shadowRoot!.querySelectorAll<HTMLElement>('.scheduler-time-slot.greyed'));
    const onDay = (d: string) => greyed.filter((s) => s.dataset['dayIndex'] === d).length;
    expect(greyed).toHaveLength(8);
    expect(onDay('2')).toBe(4); // 22:00 .. 23:30
    expect(onDay('3')).toBe(4); // 00:00 .. 01:30
    press('mouseup', document, 200);
    await settle(el);
    expect(greyedCount()).toBe(0);
  });
});

describe('now indicator', () => {
  // 09:00 with 30-minute slots of 40px: 540 min / 30 * 40 = 720px.
  const NOW = new Date(2026, 4, 12, 9, 0);
  const TICK_ID = 4242;
  const indicator = () => el.shadowRoot!.querySelector<HTMLElement>('.scheduler-now-indicator');
  let ticks: (() => void)[] = [];

  /**
   * Only the clock is faked. setInterval is NOT: jsdom drives its animation
   * frames off the global setInterval, and a frame queued while that is fake
   * never fires again for the rest of the worker. The minute tick is captured
   * instead and fired by hand.
   */
  const fakeClock = () => {
    vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
    ticks = [];
    const real = globalThis.setInterval;
    vi.spyOn(globalThis, 'setInterval').mockImplementation(((fn: () => void, ms?: number, ...rest: unknown[]) => {
      if (ms === 60000) {
        ticks.push(fn);
        return TICK_ID;
      }
      return real(fn, ms, ...rest);
    }) as typeof setInterval);
  };
  const tick = () => ticks.map((fn) => fn());

  afterEach(() => vi.restoreAllMocks());

  it.each(['week', 'day'] as const)('%s view draws it at the current time and moves it every minute', async (view) => {
    fakeClock();
    await mount(view);
    expect(indicator()?.style.top).toBe('720px');
    vi.setSystemTime(new Date(2026, 4, 12, 9, 3));
    tick();
    expect(indicator()?.style.top).toBe('724px');
    expect(el.shadowRoot!.querySelectorAll('.scheduler-now-indicator')).toHaveLength(1);
  });

  it.each(['week', 'day'] as const)('%s view recreates a missing indicator on the next tick', async (view) => {
    fakeClock();
    await mount(view);
    indicator()!.remove();
    tick();
    expect(indicator()?.style.top).toBe('720px');
  });

  it.each(['week', 'day'] as const)('%s view draws none when switched off', async (view) => {
    fakeClock();
    await mount(view, (e) => (e.options = { nowIndicator: false }));
    tick();
    expect(indicator()).toBeNull();
  });

  it.each(['week', 'day'] as const)('%s view draws none away from today', async (view) => {
    fakeClock();
    await mount(view, () => undefined, new Date(2026, 5, 20));
    tick();
    expect(indicator()).toBeNull();
  });

  it('stops ticking once the element is removed', async () => {
    fakeClock();
    const cleared = vi.spyOn(globalThis, 'clearInterval');
    await mount('day');
    el.remove();
    expect(cleared).toHaveBeenCalledWith(TICK_ID);
  });
});

describe('timeline — resource column resizer', () => {
  const RESOURCES = [{ id: 'alice', title: 'Alice' }];
  const width = () =>
    el.shadowRoot!.querySelector<HTMLElement>('.scheduler-content')!.style.getPropertyValue(
      '--scheduler-resource-column-width',
    );
  const resizer = () => el.shadowRoot!.querySelector<HTMLElement>('.scheduler-column-resizer')!;
  const keyOn = (k: string) => {
    const ev = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true });
    resizer().dispatchEvent(ev);
    return ev;
  };

  it.each(['ArrowLeft', 'ArrowRight', 'Home', 'End'])('%s resizes the column and claims the key', async (k) => {
    await mount('timeline', (e) => (e.resources = RESOURCES));
    const ev = keyOn(k);
    expect(ev.defaultPrevented).toBe(true);
    expect(width()).toMatch(/^min\(\d+px, calc\(100% - 50px\)\)$/);
    expect(resizer().getAttribute('aria-valuenow')).toMatch(/^\d+$/);
  });

  it('Home collapses the column to its minimum', async () => {
    await mount('timeline', (e) => (e.resources = RESOURCES));
    keyOn('Home');
    expect(width()).toBe('min(80px, calc(100% - 50px))');
  });

  it('other keys are left alone', async () => {
    await mount('timeline', (e) => (e.resources = RESOURCES));
    expect(keyOn('a').defaultPrevented).toBe(false);
    expect(width()).toBe('');
  });

  it('a pointer drag resizes until release, then stops listening', async () => {
    await mount('timeline', (e) => (e.resources = RESOURCES));
    const down = new PointerEvent('pointerdown', { bubbles: true, composed: true, cancelable: true, clientX: 200 });
    resizer().dispatchEvent(down);
    expect(down.defaultPrevented).toBe(true);

    document.dispatchEvent(new PointerEvent('pointermove', { clientX: 260 }));
    expect(width()).not.toBe('');

    document.dispatchEvent(new PointerEvent('pointerup', {}));
    const content = el.shadowRoot!.querySelector<HTMLElement>('.scheduler-content')!;
    content.style.removeProperty('--scheduler-resource-column-width');
    document.dispatchEvent(new PointerEvent('pointermove', { clientX: 400 }));
    expect(width()).toBe('');
  });
});

describe('timeline — focus survives a rebuild', () => {
  const TEAM = [{ id: 'team', title: 'Team', children: [{ id: 'alice', title: 'Alice' }] }];
  const active = () => el.shadowRoot!.activeElement as HTMLElement | null;

  it('the group toggle keeps focus after collapsing its group', async () => {
    await mount('timeline', (e) => (e.resources = TEAM));
    const toggle = el.shadowRoot!.querySelector<HTMLElement>('[data-action="toggle-group"][data-group-id="team"]')!;
    toggle.focus();
    toggle.click();
    await settle(el);
    const now = active();
    expect(now).not.toBe(toggle); // rebuilt: a different node…
    expect(now?.dataset['action']).toBe('toggle-group'); // …standing for the same control
    expect(now?.dataset['groupId']).toBe('team');
  });

  it('when the focused control own row is gone, focus falls back to the add bar', async () => {
    await mount('timeline', (e) => {
      e.resources = TEAM;
      e.options = { permissions: { createResource: true, updateResource: true } };
    });
    const trigger = el.shadowRoot!.querySelector<HTMLElement>('[data-action="row-menu"][data-resource-id="alice"]')!;
    trigger.focus();
    el.resources = [{ id: 'team', title: 'Team', children: [] }];
    await settle(el);
    expect(active()?.classList.contains('scheduler-add-button')).toBe(true);
  });
});
