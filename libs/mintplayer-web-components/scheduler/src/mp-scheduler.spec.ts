import { afterEach, describe, expect, it } from 'vitest';
import './generated';
import type { MpScheduler } from './generated';
import type {
  Resource,
  ResourceGroup,
  SchedulerEvent,
  SchedulerEventCreateDetail,
  SchedulerEventDeleteDetail,
  SchedulerEventSelectedDetail,
  ViewType,
} from '@mintplayer/ui-core/scheduler';

/**
 * The generated Lit front of the scheduler (#437 D10). jsdom has no layout, so
 * geometry and pointer gestures are covered by the ui-core specs (drag, input,
 * state, geometry) and e2e; these specs cover the light-DOM structure, ARIA,
 * the commands, the keyboard grid and the outputs.
 */
const DAY = new Date(2026, 9, 14);
const at = (h: number, m = 0) => {
  const d = new Date(DAY);
  d.setHours(h, m, 0, 0);
  return d;
};

const EVENTS: SchedulerEvent[] = [
  { id: 'standup', title: 'Standup', start: at(9), end: at(9, 30) },
  { id: 'lunch', title: 'Lunch', start: at(12), end: at(13), resourceId: 'alice' },
];

const RESOURCES: (Resource | ResourceGroup)[] = [
  { id: 'team', title: 'Team', children: [{ id: 'alice', title: 'Alice' }, { id: 'bob', title: 'Bob' }] },
];

let scheduler: MpScheduler;

const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));

async function settle(): Promise<void> {
  await scheduler.updateComplete;
  await frame();
  await scheduler.updateComplete;
}

async function mount(view: ViewType = 'day', init: Partial<MpScheduler> = {}): Promise<MpScheduler> {
  scheduler = document.createElement('mp-scheduler') as MpScheduler;
  scheduler.events = EVENTS.map((e) => ({ ...e }));
  scheduler.view = view;
  scheduler.date = new Date(DAY);
  Object.assign(scheduler, init);
  document.body.appendChild(scheduler);
  await settle();
  return scheduler;
}

afterEach(() => {
  scheduler?.remove();
  document.body.innerHTML = '';
});

function record<T>(type: string): T[] {
  const seen: T[] = [];
  scheduler.addEventListener(type, (e) => seen.push((e as CustomEvent<T>).detail));
  return seen;
}

/** The core reads the focused node, as a real key press would: focus first, then the key. */
const key = (el: HTMLElement, name: string, init: KeyboardEventInit = {}) => {
  el.focus();
  return el.dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true, ...init }));
};

const root = () => scheduler;
const grid = () => scheduler.querySelector<HTMLElement>('[role="grid"]')!;
const eventEl = (id: string) => scheduler.querySelector<HTMLElement>(`[data-event-id="${id}"]`)!;
const viewButton = (view: ViewType) => scheduler.querySelector<HTMLButtonElement>(`.scheduler-view-switcher [data-view="${view}"]`)!;
const roving = () => scheduler.querySelector<HTMLElement>('[role="gridcell"][tabindex="0"]')!;

describe('mp-scheduler', () => {
  it('renders in the light DOM, stamped with its scope', async () => {
    await mount();
    expect(scheduler.shadowRoot).toBeNull();
    expect(root().getAttribute('data-mps')).toBe('scheduler');
    expect(root().getAttribute('data-view')).toBe('day');
  });

  it('exposes a labelled grid, a navigation landmark and a pressed view switcher', async () => {
    await mount();
    expect(grid().getAttribute('aria-label')).toBeTruthy();
    expect(document.getElementById(grid().getAttribute('aria-describedby')!)).not.toBeNull();
    expect(scheduler.querySelector('nav.scheduler-nav')!.getAttribute('aria-label')).toBeTruthy();
    for (const nav of ['prev', 'next', 'today']) {
      const button = scheduler.querySelector(`[data-nav="${nav}"]`)!;
      expect(button.getAttribute('aria-label')).toBeTruthy();
    }
    expect(scheduler.querySelector('.scheduler-view-switcher')!.getAttribute('role')).toBe('group');
    expect(viewButton('day').getAttribute('aria-pressed')).toBe('true');
    expect(viewButton('week').getAttribute('aria-pressed')).toBe('false');
  });

  it('renders events as named, pressable buttons', async () => {
    await mount();
    const standup = eventEl('standup');
    expect(standup.getAttribute('role')).toBe('button');
    expect(standup.getAttribute('aria-label')).toContain('Standup');
    expect(standup.getAttribute('aria-pressed')).toBe('false');
    expect(standup.textContent).toContain('Standup');
  });

  it('switches the view from the switcher, two-way', async () => {
    await mount();
    const views = record<ViewType>('viewchange');
    viewButton('month').click();
    await settle();
    expect(views).toEqual(['month']);
    expect(scheduler.view).toBe('month');
    expect(root().getAttribute('data-view')).toBe('month');
    expect(viewButton('month').getAttribute('aria-pressed')).toBe('true');
  });

  it('navigates periods with the commands and the nav buttons', async () => {
    await mount();
    const dates = record<Date>('datechange');
    const title = () => scheduler.querySelector('.scheduler-title')!.textContent;
    const before = title();
    scheduler.next();
    await settle();
    expect(dates).toHaveLength(1);
    expect(dates[0].getDate()).toBe(15);
    expect(title()).not.toBe(before);
    scheduler.querySelector<HTMLButtonElement>('[data-nav="prev"]')!.click();
    await settle();
    expect(scheduler.date.getDate()).toBe(14);
    expect(title()).toBe(before);
  });

  it('selects an event when it takes focus and reports it', async () => {
    await mount();
    const selected = record<SchedulerEventSelectedDetail>('eventselected');
    const changes = record<SchedulerEvent | null>('selectedeventchange');
    eventEl('standup').focus();
    await settle();
    expect(selected.map((d) => d.event.id)).toEqual(['standup']);
    expect(changes.map((e) => e?.id)).toEqual(['standup']);
    expect(eventEl('standup').getAttribute('aria-pressed')).toBe('true');
  });

  it('requests a delete on Delete, and leaves the data to the consumer', async () => {
    await mount();
    const deletes = record<SchedulerEventDeleteDetail>('eventdelete');
    key(eventEl('standup'), 'Delete');
    await settle();
    expect(deletes.map((d) => d.event.id)).toEqual(['standup']);
    expect(eventEl('standup')).not.toBeNull();
  });

  it('refuses a delete when readonly', async () => {
    await mount('day', { readonly: true });
    const deletes = record<SchedulerEventDeleteDetail>('eventdelete');
    key(eventEl('standup'), 'Delete');
    await settle();
    expect(deletes).toEqual([]);
  });

  it('keeps exactly one tabbable cell and moves it with the arrow keys', async () => {
    await mount();
    expect(scheduler.querySelectorAll('[role="gridcell"][tabindex="0"]')).toHaveLength(1);
    const first = roving();
    const start = first.getAttribute('data-start');
    key(first, 'ArrowDown');
    await settle();
    const next = roving();
    expect(scheduler.querySelectorAll('[role="gridcell"][tabindex="0"]')).toHaveLength(1);
    expect(new Date(next.getAttribute('data-start')!).getTime()).toBeGreaterThan(new Date(start!).getTime());
  });

  it('requests an event over the focused cell on Enter', async () => {
    await mount();
    const creates = record<SchedulerEventCreateDetail>('eventcreate');
    const cell = roving();
    key(cell, 'Enter');
    await settle();
    expect(creates).toHaveLength(1);
    expect(creates[0].range.start.toISOString()).toBe(cell.getAttribute('data-start'));
  });

  it('extends a range with Shift+arrow and clears it when the two-way input is cleared', async () => {
    await mount();
    const ranges = record<unknown>('selectedrangechange');
    key(roving(), 'ArrowDown', { shiftKey: true });
    await settle();
    expect(ranges.at(-1)).not.toBeNull();
    expect(scheduler.querySelectorAll('[role="gridcell"][aria-selected="true"]').length).toBeGreaterThan(1);
    scheduler.selectedRange = null;
    await settle();
    expect(scheduler.querySelectorAll('[role="gridcell"][aria-selected="true"]')).toHaveLength(0);
  });

  it('switches views with Alt+letter', async () => {
    await mount();
    key(roving(), 'w', { altKey: true });
    await settle();
    expect(scheduler.view).toBe('week');
    expect(scheduler.querySelectorAll('.scheduler-day-column[role="row"]')).toHaveLength(7);
  });

  it('renders the timeline as a grid of resource rows', async () => {
    await mount('timeline', { resources: RESOURCES });
    const timeline = scheduler.querySelector<HTMLElement>('.scheduler-timeline')!;
    expect(timeline.getAttribute('role')).toBe('grid');
    const headers = [...scheduler.querySelectorAll('[role="rowheader"]')].map((h) => h.textContent!.trim());
    expect(headers.some((h) => h.includes('Alice'))).toBe(true);
    expect(headers.some((h) => h.includes('Bob'))).toBe(true);
    expect(eventEl('lunch')).not.toBeNull();
  });

  it('renders the month and year views as grids', async () => {
    await mount('month');
    expect(grid().classList.contains('scheduler-month-view')).toBe(true);
    expect(scheduler.querySelectorAll('.scheduler-month-week[role="row"]').length).toBeGreaterThanOrEqual(4);
    scheduler.view = 'year';
    await settle();
    expect(scheduler.querySelectorAll('.scheduler-year-month[role="gridcell"]')).toHaveLength(12);
  });
});
