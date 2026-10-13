import { afterEach, describe, expect, it } from 'vitest';
import './mp-scheduler';
import type { MpScheduler } from './mp-scheduler';
import {
  nextRaf,
  mount,
  dispatchKey,
  getState,
  focusYearCell,
  useFakeAnimationFrames,
} from '../../testing/scheduler-spec-fixture';

/**
 * Month day popover, year date surface, composed events, timeline stacking / drag ghost / move-mode, the per-gesture pointer permission gate and popover delete buttons.
 *
 * One of four files split out of the original mp-scheduler.keyboard.spec.ts so
 * vitest can run them in parallel; the fixture is shared in
 * scheduler/testing/scheduler-spec-fixture.ts.
 */
useFakeAnimationFrames();

/** M10 — the month day popover. */
describe('mp-scheduler — month day popover', () => {
  let el: MpScheduler;
  afterEach(() => el?.remove());

  const EVENTS = [
    { id: 'a', title: 'Standup', start: new Date(2026, 4, 12, 9, 0), end: new Date(2026, 4, 12, 9, 30) },
    { id: 'b', title: 'Lunch', start: new Date(2026, 4, 12, 12, 0), end: new Date(2026, 4, 12, 13, 0) },
    { id: 'c', title: 'Retro', start: new Date(2026, 4, 12, 15, 0), end: new Date(2026, 4, 12, 16, 0) },
    { id: 'd', title: 'Review', start: new Date(2026, 4, 12, 17, 0), end: new Date(2026, 4, 12, 18, 0) },
  ];

  const mountMonth = async (options: Record<string, unknown> = {}) => {
    el = document.createElement('mp-scheduler') as MpScheduler;
    el.setAttribute('locale', 'en-US'); // deterministic dates; see mount()
    document.body.appendChild(el);
    (el as unknown as { date: Date }).date = new Date(2026, 4, 12);
    (el as unknown as { events: unknown[] }).events = EVENTS;
    (el as unknown as { options: unknown }).options = options;
    el.setAttribute('view', 'month');
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();
    return el;
  };

  const popover = () => el.shadowRoot!.querySelector('.scheduler-day-popover');

  const settle = async () => {
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();
  };

  it('the "+N more" link opens the popover instead of drilling into the day view', async () => {
    await mountMonth();
    el.shadowRoot!.querySelector<HTMLElement>('.scheduler-more-link')!.click();
    await settle();
    expect(popover()).not.toBeNull();
    expect(popover()!.getAttribute('role')).toBe('dialog');
    // Named by date, and listing every event on the day — not just the hidden ones.
    expect(popover()!.getAttribute('aria-label')).toContain('Events on');
    expect(popover()!.querySelectorAll('.popover-event').length).toBe(EVENTS.length);
    expect(getState(el).view).toBe('month');
  });

  it('moreLinkBehavior day keeps the old drill-down', async () => {
    await mountMonth({ moreLinkBehavior: 'day' });
    el.shadowRoot!.querySelector<HTMLElement>('.scheduler-more-link')!.click();
    await settle();
    expect(popover()).toBeNull();
    expect(getState(el).view).toBe('day');
  });

  // Phase 2 (D12.2c): the default flipped from 'none' to 'popover' — the click
  // surface is what the popover exists for. `date-click` still emits FIRST in
  // both modes, so a consumer's own handler is unaffected by the default.
  it('a plain cell click emits date-click and opens the popover by default; dayClickAction none opts out', async () => {
    await mountMonth();
    const clicks: Date[] = [];
    el.addEventListener('date-click', (e) => clicks.push((e as CustomEvent).detail.date));
    el.shadowRoot!.querySelector<HTMLElement>('#scheduler-cell-m-2026-05-14')!.click();
    await settle();
    expect(clicks.length).toBe(1);
    expect(popover()).not.toBeNull();
    el.remove();

    await mountMonth({ dayClickAction: 'none' });
    const optedOut: Date[] = [];
    el.addEventListener('date-click', (e) => optedOut.push((e as CustomEvent).detail.date));
    el.shadowRoot!.querySelector<HTMLElement>('#scheduler-cell-m-2026-05-14')!.click();
    await settle();
    expect(optedOut.length).toBe(1);
    expect(popover()).toBeNull();
  });

  it('clicking the day number drills into the day view', async () => {
    await mountMonth({ dayClickAction: 'popover' });
    el.shadowRoot!
      .querySelector<HTMLElement>('#scheduler-cell-m-2026-05-14 .day-number')!
      .click();
    await settle();
    expect(popover()).toBeNull();
    expect(getState(el).view).toBe('day');
    expect(getState(el).date.getDate()).toBe(14);
  });

  it('Escape closes it; activating an entry emits event-selected and closes', async () => {
    await mountMonth();
    el.shadowRoot!.querySelector<HTMLElement>('.scheduler-more-link')!.click();
    await settle();
    // Focus lands on the first EVENT, not the close button in the header — a
    // dialog that opens focused on "close" dismisses itself on the first Enter.
    expect(el.shadowRoot!.activeElement?.classList.contains('popover-event')).toBe(true);
    dispatchKey(el, 'Escape');
    await settle();
    expect(popover()).toBeNull();

    el.shadowRoot!.querySelector<HTMLElement>('.scheduler-more-link')!.click();
    await settle();
    let selected: string | null = null;
    el.addEventListener('event-selected', (e) => {
      selected = (e as CustomEvent).detail.event.id;
    });
    el.shadowRoot!.querySelectorAll<HTMLElement>('.popover-event')[1].click();
    await settle();
    expect(selected).toBe('b');
    expect(popover()).toBeNull();
  });

  it('New event requests the whole day, and is absent when creation is denied', async () => {
    await mountMonth();
    el.shadowRoot!.querySelector<HTMLElement>('.scheduler-more-link')!.click();
    await settle();
    let range: { start: Date; end: Date } | null = null;
    el.addEventListener('event-create', (e) => {
      range = (e as CustomEvent).detail.range;
    });
    el.shadowRoot!.querySelector<HTMLElement>('.popover-action.primary')!.click();
    await settle();
    expect(range).not.toBeNull();
    expect(range!.start.getHours()).toBe(0);
    expect(range!.end.getDate()).toBe(range!.start.getDate() + 1);
    el.remove();

    await mountMonth({ permissions: false });
    el.shadowRoot!.querySelector<HTMLElement>('.scheduler-more-link')!.click();
    await settle();
    expect(popover()).not.toBeNull();
    expect(popover()!.querySelector('.popover-action.primary')).toBeNull();
  });

  it('Space on a focused day cell opens the popover; Enter still requests an event', async () => {
    await mountMonth();
    el.shadowRoot!.querySelector<HTMLElement>('#scheduler-cell-m-2026-05-14')!.focus();
    await settle();
    dispatchKey(el, ' ');
    await settle();
    expect(popover()).not.toBeNull();
    el.remove();

    await mountMonth();
    el.shadowRoot!.querySelector<HTMLElement>('#scheduler-cell-m-2026-05-14')!.focus();
    await settle();
    let created = false;
    el.addEventListener('event-create', () => {
      created = true;
    });
    dispatchKey(el, 'Enter');
    await settle();
    expect(created).toBe(true);
  });
});

/**
 * M18 — the date popover reaches the year view (D12.2), anchored on the month
 * CARD: mini-days stay unfocusable by design, so the card is the only element
 * that can position the panel and receive focus back. Before this, a year
 * mini-day click leaked into the month-only anchor path and painted an
 * UNPOSITIONED fixed panel (B23).
 */
describe('mp-scheduler — year date surface (M18)', () => {
  let el: MpScheduler;
  afterEach(() => el?.remove());

  const EVENTS = [
    { id: 'a', title: 'Kickoff', start: new Date(2026, 4, 12, 9, 0), end: new Date(2026, 4, 12, 10, 0) },
    { id: 'b', title: 'Review', start: new Date(2026, 4, 20, 14, 0), end: new Date(2026, 4, 20, 15, 0) },
  ];

  const mountYear = async (options: Record<string, unknown> = {}) => {
    el = document.createElement('mp-scheduler') as MpScheduler;
    el.setAttribute('locale', 'en-US'); // deterministic dates; see mount()
    document.body.appendChild(el);
    (el as unknown as { date: Date }).date = new Date(2026, 4, 12);
    (el as unknown as { events: unknown[] }).events = EVENTS;
    (el as unknown as { options: unknown }).options = options;
    el.setAttribute('view', 'year');
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();
    return el;
  };

  const settle = async () => {
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();
  };

  const popover = () => el.shadowRoot!.querySelector('.scheduler-day-popover');
  const anchorEl = () => {
    const id = (el as unknown as { popoverAnchorId: string | null }).popoverAnchorId;
    return id ? el.shadowRoot!.getElementById(id) : null;
  };
  const miniDay = (cardKey: string, localDate: Date) =>
    [...el.shadowRoot!.querySelectorAll<HTMLElement>(
      `#scheduler-cell-y-${cardKey} .scheduler-mini-day[data-date]`,
    )].find((d) => {
      const parsed = new Date(d.dataset['date']!);
      return (
        parsed.getFullYear() === localDate.getFullYear() &&
        parsed.getMonth() === localDate.getMonth() &&
        parsed.getDate() === localDate.getDate()
      );
    }) ?? null;

  it('Space on a focused month card opens a MONTH-scoped popover grouped by day', async () => {
    await mountYear();
    focusYearCell(el, '2026-05');
    dispatchKey(el, ' ');
    await settle();
    expect(popover()).not.toBeNull();
    expect(popover()!.getAttribute('aria-label')).toContain('May 2026');
    // Two events on two different days → two day groups, each with one entry.
    expect(popover()!.querySelectorAll('.popover-day-label').length).toBe(2);
    expect(popover()!.querySelectorAll('.popover-event').length).toBe(2);
    // The anchor is the card itself — a real element, so the panel can position
    // and focus can return (the B23 failure mode was a null anchor).
    expect(anchorEl()).not.toBeNull();
    expect(anchorEl()!.id).toBe('scheduler-cell-y-2026-05');
    // "Show month" drills into the month.
    (popover()!.querySelector('.popover-action:not(.primary)') as HTMLElement).click();
    await settle();
    expect(getState(el).view).toBe('month');
    expect(getState(el).date.getMonth()).toBe(4);
  });

  it('clicking a mini-day opens the DAY-scoped popover anchored on its card', async () => {
    await mountYear();
    const day = miniDay('2026-05', new Date(2026, 4, 12));
    expect(day).not.toBeNull();
    const clicks: Date[] = [];
    el.addEventListener('date-click', (e) => clicks.push((e as CustomEvent).detail.date));
    day!.click();
    await settle();
    expect(clicks.length).toBe(1);
    expect(popover()).not.toBeNull();
    expect(popover()!.querySelectorAll('.popover-event').length).toBe(1);
    expect(anchorEl()).not.toBeNull();
    expect(anchorEl()!.id).toBe('scheduler-cell-y-2026-05');
  });

  it('an adjacent-month mini-day anchors on the card it was clicked in', async () => {
    await mountYear();
    // January's grid shows trailing December-of-last-year days, whose own month
    // key names a card that does not exist in this year's grid.
    const outOfYear = [...el.shadowRoot!.querySelectorAll<HTMLElement>(
      '#scheduler-cell-y-2026-01 .scheduler-mini-day.other-month[data-date]',
    )][0];
    expect(outOfYear).toBeDefined();
    outOfYear.click();
    await settle();
    expect(popover()).not.toBeNull();
    expect(anchorEl()).not.toBeNull();
    expect(anchorEl()!.id).toBe('scheduler-cell-y-2026-01');
  });

  it('dayClickAction none keeps a mini-day click date-click-only', async () => {
    await mountYear({ dayClickAction: 'none' });
    const day = miniDay('2026-05', new Date(2026, 4, 12));
    const clicks: Date[] = [];
    el.addEventListener('date-click', (e) => clicks.push((e as CustomEvent).detail.date));
    day!.click();
    await settle();
    expect(clicks.length).toBe(1);
    expect(popover()).toBeNull();
  });

  it('month cards carry their event count as text (WCAG 1.4.1 for .has-events)', async () => {
    await mountYear();
    const may = el.shadowRoot!.querySelector('#scheduler-cell-y-2026-05')!;
    expect(may.getAttribute('aria-label')).toContain('May 2026');
    expect(may.getAttribute('aria-label')).toContain('2 events');
    const june = el.shadowRoot!.querySelector('#scheduler-cell-y-2026-06')!;
    expect(june.getAttribute('aria-label')).toContain('0 events');
  });

  it('the create action carries the picked resource on event-create (D12.2d)', async () => {
    await mountYear();
    (el as unknown as { resources: unknown[] }).resources = [
      { id: 'alice', title: 'Alice' },
      { id: 'bob', title: 'Bob' },
    ];
    await settle();
    focusYearCell(el, '2026-05');
    dispatchKey(el, ' ');
    await settle();
    // An <mp-select> (Bootstrap styling does not cross the shadow boundary), so
    // `value` is a host property — settable exactly like the native one.
    const picker = popover()!.querySelector<HTMLElement & { value: string | null }>(
      'mp-select.popover-resource-select',
    )!;
    expect(picker).not.toBeNull();
    picker.value = 'bob';
    let detail: { resourceId?: string } | null = null;
    el.addEventListener('event-create', (e) => {
      detail = (e as CustomEvent).detail;
    });
    (popover()!.querySelector('.popover-action.primary') as HTMLElement).click();
    await settle();
    expect(detail).not.toBeNull();
    expect(detail!.resourceId).toBe('bob');
  });
});

/**
 * M9 — every scheduler event must escape a nesting shadow root. Without
 * `composed`, a scheduler inside another component's shadow DOM is silent to the
 * outer consumer, which reads as "the wrapper dropped my handler".
 */
describe('mp-scheduler — events are composed', () => {
  it('a custom event crosses an enclosing shadow boundary', async () => {
    const outer = document.createElement('div');
    document.body.appendChild(outer);
    const root = outer.attachShadow({ mode: 'open' });
    const el = document.createElement('mp-scheduler') as MpScheduler;
    el.setAttribute('locale', 'en-US'); // deterministic dates; see mount()
    root.appendChild(el);
    (el as unknown as { date: Date }).date = new Date(2026, 4, 12);
    el.setAttribute('view', 'month');
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();

    let heard = false;
    document.addEventListener('date-click', () => {
      heard = true;
    }, { once: true });
    el.shadowRoot!.querySelector<HTMLElement>('#scheduler-cell-m-2026-05-14')!.click();
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    expect(heard).toBe(true);
    outer.remove();
  });
});

/**
 * Timeline tracks stack at a CONSTANT height and grow their row, rather than
 * dividing a fixed row between them.
 *
 * Week and day must divide: there height IS duration. The timeline's vertical
 * axis carries no information — time runs horizontally and the panel scrolls —
 * so two overlapping events used to render as two ~18px slivers of a 40px row.
 */
describe('mp-scheduler — timeline track stacking', () => {
  let el: MpScheduler;
  afterEach(() => el?.remove());

  it('overlapping events keep one height and stack, growing the resource row', async () => {
    el = document.createElement('mp-scheduler') as MpScheduler;
    el.setAttribute('locale', 'en-US'); // deterministic dates; see mount()
    document.body.appendChild(el);
    (el as unknown as { date: Date }).date = new Date(2026, 4, 12);
    (el as unknown as { resources: unknown[] }).resources = [{ id: 'alice', title: 'Alice' }];
    (el as unknown as { events: unknown[] }).events = [
      { id: 'a', title: 'A', resourceId: 'alice', start: new Date(2026, 4, 12, 9, 0), end: new Date(2026, 4, 12, 12, 0) },
      { id: 'b', title: 'B', resourceId: 'alice', start: new Date(2026, 4, 12, 10, 0), end: new Date(2026, 4, 12, 13, 0) },
      { id: 'c', title: 'C', resourceId: 'alice', start: new Date(2026, 4, 12, 11, 0), end: new Date(2026, 4, 12, 14, 0) },
    ];
    el.setAttribute('view', 'timeline');
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();

    const boxes = Array.from(
      el.shadowRoot!.querySelectorAll<HTMLElement>('.scheduler-timeline-event:not(.preview)'),
    );
    expect(boxes.length).toBe(3);

    // Every box the same height, expressed in px — a percentage of the row is
    // exactly what produced the slivers.
    const heights = boxes.map((b) => b.style.height);
    expect(new Set(heights).size).toBe(1);
    expect(heights[0]).toMatch(/px$/);

    // Distinct, ascending track offsets.
    const tops = boxes.map((b) => Number.parseFloat(b.style.top)).sort((x, y) => x - y);
    expect(new Set(tops).size).toBe(3);
    expect(tops[1] - tops[0]).toBeCloseTo(tops[2] - tops[1], 1);

    // The row grew past the 40px single-track baseline, and past three bands.
    const trackHeight = Number.parseFloat(heights[0]);
    const row = el.shadowRoot!.querySelector<HTMLElement>('.scheduler-timeline-row')!;
    const rowHeight = Number.parseFloat(row.style.minHeight);
    expect(rowHeight).toBeGreaterThanOrEqual(3 * trackHeight);
    expect(rowHeight).toBeGreaterThan(40);
  });
});

/** D4.2's two remaining pieces: the strict-mode signal and the empty state. */
describe('mp-scheduler — resource-less events and an empty tree', () => {
  let el: MpScheduler;
  afterEach(() => el?.remove());

  const mountTimeline = async (props: Record<string, unknown>) => {
    el = document.createElement('mp-scheduler') as MpScheduler;
    el.setAttribute('locale', 'en-US'); // deterministic dates; see mount()
    document.body.appendChild(el);
    (el as unknown as { date: Date }).date = new Date(2026, 4, 12);
    for (const [key, value] of Object.entries(props)) {
      (el as unknown as Record<string, unknown>)[key] = value;
    }
    el.setAttribute('view', 'timeline');
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();
    return el;
  };

  const UNASSIGNED = {
    id: 'loose',
    title: 'Loose',
    start: new Date(2026, 4, 12, 9, 0),
    end: new Date(2026, 4, 12, 10, 0),
  };

  it('requireEventResource warns once per event but never hides it', async () => {
    const warnings: string[] = [];
    const original = console.warn;
    console.warn = (...args: unknown[]) => warnings.push(String(args[0]));
    try {
      await mountTimeline({
        resources: [{ id: 'alice', title: 'Alice' }],
        events: [UNASSIGNED],
        options: { requireEventResource: true },
      });
      // Re-render a few times: the warning must not repeat per frame.
      (el as unknown as { date: Date }).date = new Date(2026, 4, 12, 1);
      await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
      await nextRaf();
    } finally {
      console.warn = original;
    }

    const relevant = warnings.filter((w) => w.includes('requireEventResource'));
    expect(relevant.length).toBe(1);
    expect(relevant[0]).toContain('loose');
    // Still rendered: the option is a signal, not a filter.
    expect(el.shadowRoot!.querySelectorAll('.scheduler-timeline-event').length).toBe(1);
    expect(el.shadowRoot!.querySelector('.scheduler-timeline-row.unassigned')).not.toBeNull();
  });

  it('says so when there are no resources AND no events', async () => {
    await mountTimeline({ resources: [], events: [] });
    expect(el.shadowRoot!.querySelector('.scheduler-timeline-empty')?.textContent).toBe(
      'No resources to show.',
    );
  });

  it('shows the bucket row instead of the empty state when events exist', async () => {
    await mountTimeline({ resources: [], events: [UNASSIGNED] });
    expect(el.shadowRoot!.querySelector('.scheduler-timeline-empty')).toBeNull();
    expect(el.shadowRoot!.querySelector('.scheduler-timeline-row.unassigned')).not.toBeNull();
  });

  // B29 — deleting a resource must not orphan its events invisibly: a dangling
  // resourceId sits under an index key no row reads, so before this fix the
  // event vanished from the timeline while week/day/month kept rendering it.
  it('events of a deleted resource re-bucket to "(No resource)" and warn once', async () => {
    const warnings: string[] = [];
    const original = console.warn;
    console.warn = (...args: unknown[]) => warnings.push(String(args[0]));
    try {
      await mountTimeline({
        resources: [
          { id: 'alice', title: 'Alice' },
          { id: 'bob', title: 'Bob' },
        ],
        events: [{ ...UNASSIGNED, id: 'orphan', resourceId: 'bob' }],
      });
      expect(el.shadowRoot!.querySelector('.scheduler-timeline-row.unassigned')).toBeNull();

      // The consumer honours resource-delete without touching the events.
      (el as unknown as { resources: unknown[] }).resources = [
        { id: 'alice', title: 'Alice' },
      ];
      await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
      await nextRaf();
    } finally {
      console.warn = original;
    }

    // Still visible — in the bucket row, not gone.
    const bucket = el.shadowRoot!.querySelector('.scheduler-timeline-row.unassigned');
    expect(bucket).not.toBeNull();
    expect(bucket!.querySelectorAll('.scheduler-timeline-event').length).toBe(1);
    // And reported once, naming the event and the dangling id.
    const relevant = warnings.filter((w) => w.includes('does not exist'));
    expect(relevant.length).toBe(1);
    expect(relevant[0]).toContain('orphan');
    expect(relevant[0]).toContain('bob');
  });
});

/**
 * The timeline resize/move ghost has to find its ROW, and a resize preview
 * carries no `resourceId` of its own — so the row can only come from the dragged
 * event. That lookup used to read `resource.events`, which stopped being a live
 * mirror when the model was normalized, so the ghost silently vanished for every
 * event supplied through the `events` input (i.e. every event a drag-create or
 * an ordinary API call produces).
 */
describe('mp-scheduler — timeline drag ghost finds its row', () => {
  let el: MpScheduler;
  afterEach(() => el?.remove());

  const START = new Date(2026, 4, 12, 9, 0);
  const END = new Date(2026, 4, 12, 10, 0);
  const LONGER_END = new Date(2026, 4, 12, 12, 0);

  const mountTimeline = async (events: unknown[]) => {
    el = document.createElement('mp-scheduler') as MpScheduler;
    el.setAttribute('locale', 'en-US'); // deterministic dates; see mount()
    document.body.appendChild(el);
    (el as unknown as { date: Date }).date = new Date(2026, 4, 12);
    (el as unknown as { resources: unknown[] }).resources = [
      { id: 'group', title: 'Team', children: [{ id: 'alice', title: 'Alice' }] },
    ];
    (el as unknown as { events: unknown[] }).events = events;
    el.setAttribute('view', 'timeline');
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();
    return el;
  };

  /** Drive the state a pointer resize produces: a dragState + a preview. */
  const startResize = async (event: { id: string; start: Date; end: Date }) => {
    const manager = (
      el as unknown as { stateManager: { setState: (u: Record<string, unknown>) => void } }
    ).stateManager;
    manager.setState({
      dragState: {
        type: 'resize-end',
        event,
        startSlot: { start: event.start, end: event.end },
        currentSlot: { start: event.start, end: LONGER_END },
        // NOTE: no resourceId anywhere in here — that is the whole point.
        preview: { start: event.start, end: LONGER_END },
      },
      previewEvent: { start: event.start, end: LONGER_END },
    });
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();
  };

  it('renders the ghost in the resource row for an event from the flat events input', async () => {
    const event = { id: 'flat', title: 'Flat', resourceId: 'alice', start: START, end: END };
    await mountTimeline([event]);
    await startResize(event);

    const ghosts = el.shadowRoot!.querySelectorAll('.scheduler-timeline-event.preview');
    expect(ghosts.length).toBe(1);
    // In Alice's row, not just anywhere in the grid.
    const row = ghosts[0].closest('.scheduler-timeline-row')!;
    expect(row.querySelector('.scheduler-resource-cell')!.textContent).toContain('Alice');
  });

  it('renders the ghost in the bucket row for a resource-less event', async () => {
    const event = { id: 'loose', title: 'Loose', start: START, end: END };
    await mountTimeline([event]);
    await startResize(event);

    const ghost = el.shadowRoot!.querySelector('.scheduler-timeline-event.preview');
    expect(ghost).not.toBeNull();
    // A resource-less event is legitimately in the bucket row and still gets a
    // ghost — the old code bailed out on the missing resource id.
    expect(ghost!.closest('.scheduler-timeline-row')!.classList.contains('unassigned')).toBe(true);
  });

  it('puts the ghost on the source event track, and last in DOM order', async () => {
    const event = { id: 'flat', title: 'Flat', resourceId: 'alice', start: START, end: END };
    await mountTimeline([event]);
    await startResize(event);

    const container = el.shadowRoot!.querySelector('.scheduler-timeline-events')!;
    const boxes = Array.from(container.children) as HTMLElement[];
    const ghost = boxes.find((b) => b.classList.contains('preview'))!;
    const source = boxes.find((b) => b.dataset['eventId'] === 'flat')!;
    // Same band as its source — a ghost spanning every track of a multi-track
    // row is what the top/height copy exists to prevent.
    expect(ghost.style.top).toBe(source.style.top);
    expect(ghost.style.height).toBe(source.style.height);
    // Siblings, ghost last: jsdom cannot judge paint order, so the browser test
    // owns "on top" and this pins the structure that makes it meaningful.
    expect(boxes[boxes.length - 1]).toBe(ghost);
  });
});

/**
 * M20 — keyboard move-mode reaches the bucket row (B25/B26), and the timeline
 * entry announcement stops promising a time nudge on the resource axis (B28).
 * `nudgeKeyboardMoveResource` had NO coverage at all before this suite.
 */
describe('mp-scheduler — timeline move-mode reaches the bucket (M20)', () => {
  let el: MpScheduler;
  afterEach(() => el?.remove());

  const ASSIGNED = {
    id: 'task',
    title: 'Task',
    start: new Date(2026, 4, 12, 9, 0),
    end: new Date(2026, 4, 12, 10, 0),
    resourceId: 'bob',
  };
  // A second, unassigned event so the bucket row is rendered at all — the row
  // list only contains what the view draws.
  const LOOSE = {
    id: 'loose',
    title: 'Loose',
    start: new Date(2026, 4, 12, 11, 0),
    end: new Date(2026, 4, 12, 12, 0),
  };

  const settle = async () => {
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();
  };

  const mountTimeline = async (events: unknown[]) => {
    el = document.createElement('mp-scheduler') as MpScheduler;
    el.setAttribute('locale', 'en-US'); // deterministic dates; see mount()
    document.body.appendChild(el);
    (el as unknown as { date: Date }).date = new Date(2026, 4, 12);
    (el as unknown as { resources: unknown[] }).resources = [
      { id: 'alice', title: 'Alice' },
      { id: 'bob', title: 'Bob' },
    ];
    (el as unknown as { events: unknown[] }).events = events;
    el.setAttribute('view', 'timeline');
    await settle();
    return el;
  };

  const enterMoveModeOn = async (id: string) => {
    const eventEl = [...el.shadowRoot!.querySelectorAll<HTMLElement>('.scheduler-timeline-event')]
      .find((n) => n.dataset['eventId'] === id)!;
    eventEl.focus();
    await nextRaf();
    dispatchKey(el, 'Enter');
    await settle();
  };

  it('ArrowUp walks the move preview to the previous resource row', async () => {
    await mountTimeline([ASSIGNED, LOOSE]);
    await enterMoveModeOn('task');
    dispatchKey(el, 'ArrowUp');
    await settle();
    expect(getState(el).previewEvent?.resourceId).toBe('alice');
  });

  it('ArrowDown past the last resource lands in the bucket; Enter commits with resourceId ABSENT', async () => {
    await mountTimeline([ASSIGNED, LOOSE]);
    await enterMoveModeOn('task');
    dispatchKey(el, 'ArrowDown');
    await settle();
    // Preview names the bucket explicitly (null), not "no row" (undefined).
    expect(getState(el).previewEvent?.resourceId).toBeNull();
    // And the ghost renders IN the bucket row, not back in bob's (B26).
    const bucketGhost = el.shadowRoot!.querySelector(
      '.scheduler-timeline-row.unassigned .scheduler-timeline-event.preview',
    );
    expect(bucketGhost).not.toBeNull();

    let detail: { event: { resourceId?: string } } | null = null;
    el.addEventListener('event-update', (e) => {
      detail = (e as CustomEvent).detail;
    });
    dispatchKey(el, 'Enter');
    await settle();
    expect(detail).not.toBeNull();
    // Absent — not the old resource kept by a truthiness spread (B26).
    expect('resourceId' in detail!.event).toBe(false);
  });

  it('Escape restores the original row after a resource nudge', async () => {
    await mountTimeline([ASSIGNED, LOOSE]);
    await enterMoveModeOn('task');
    dispatchKey(el, 'ArrowDown');
    await settle();
    dispatchKey(el, 'Escape');
    await settle();
    const live = getState(el).events.find((e) => e.id === 'task') as { resourceId?: string };
    expect(live.resourceId).toBe('bob');
  });

  it('without a rendered bucket row, ArrowDown from the last resource is a no-move', async () => {
    await mountTimeline([ASSIGNED]);
    await enterMoveModeOn('task');
    dispatchKey(el, 'ArrowDown');
    await settle();
    expect(getState(el).previewEvent?.resourceId).toBe('bob');
  });

  it('the timeline entry announcement names the resource axis (B28)', async () => {
    await mountTimeline([ASSIGNED, LOOSE]);
    await enterMoveModeOn('task');
    const live = el.shadowRoot!.querySelector('[role="status"]');
    expect(live?.textContent).toContain('Up and Down arrows change the resource');
  });

  it('plain cell navigation reaches the bucket row too (B25)', async () => {
    await mountTimeline([ASSIGNED, LOOSE]);
    const bobSlot = el.shadowRoot!.querySelector<HTMLElement>(
      '.scheduler-timeline-slot[data-resource-id="bob"]',
    )!;
    bobSlot.focus();
    await nextRaf();
    dispatchKey(el, 'ArrowDown');
    await settle();
    const active = el.shadowRoot!.activeElement as HTMLElement | null;
    expect(active?.dataset['unassigned']).toBe('true');
  });
});

/**
 * M21 (B24) — the pointer path is gated per GESTURE. isEditable() is an OR of
 * four capabilities, so before this gate `moveEvent: false, createEvent: true`
 * still allowed a mouse move-drag that keyboard move-mode correctly refused.
 */
describe('mp-scheduler — per-gesture pointer permission gate (M21)', () => {
  let el: MpScheduler;
  afterEach(() => el?.remove());

  const EV = {
    id: 'task',
    title: 'Task',
    start: new Date(2026, 4, 12, 9, 0),
    end: new Date(2026, 4, 12, 10, 0),
  };

  const mountWeek = async (permissions: Record<string, unknown>) => {
    el = document.createElement('mp-scheduler') as MpScheduler;
    el.setAttribute('locale', 'en-US'); // deterministic dates; see mount()
    document.body.appendChild(el);
    (el as unknown as { date: Date }).date = new Date(2026, 4, 12);
    (el as unknown as { events: unknown[] }).events = [EV];
    (el as unknown as { options: unknown }).options = { permissions };
    el.setAttribute('view', 'week');
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();
    return el;
  };

  type Internals = {
    handlePointerDown: (
      pointer: { x: number; y: number; target: HTMLElement; originalEvent: Event },
      target: Record<string, unknown>,
    ) => void;
    dragManager: {
      isPending: () => boolean;
      cancel: () => void;
      setSlotResolver: (fn: () => unknown) => void;
    };
  };

  const pointerDown = (target: Record<string, unknown>) => {
    const internals = el as unknown as Internals;
    // jsdom has no shadowRoot.elementsFromPoint — stub the resolver the drag
    // manager consults on pointer-down. The GATE under test runs before it.
    internals.dragManager.setSlotResolver(() => ({
      start: new Date(2026, 4, 12, 9, 0),
      end: new Date(2026, 4, 12, 9, 30),
    }));
    const host = el.shadowRoot!.querySelector<HTMLElement>('.scheduler-content')!;
    internals.handlePointerDown(
      { x: 100, y: 100, target: host, originalEvent: new MouseEvent('mousedown') },
      target,
    );
    const pending = internals.dragManager.isPending();
    internals.dragManager.cancel();
    return pending;
  };

  it('moveEvent:false refuses a move-drag but createEvent still allows drag-create', async () => {
    await mountWeek({ moveEvent: false, createEvent: true });
    expect(pointerDown({ type: 'event', event: EV })).toBe(false);
    expect(pointerDown({ type: 'slot' })).toBe(true);
  });

  /**
   * D12.13 — per-edge control lives on the ITEM, not on the permission table.
   * A global "no user may ever resize any start edge" answers a question
   * nobody asks; "this shift already clocked in, its start is pinned" is
   * data-dependent, which is what a per-item flag is for.
   */
  it('each resize edge is gated by the ITEM, at the gesture', async () => {
    await mountWeek({});
    const pinnedStart = { ...EV, resizable: { start: false, end: true } };
    expect(
      pointerDown({ type: 'resize-handle', event: pinnedStart, resizeHandle: 'start' }),
    ).toBe(false);
    expect(
      pointerDown({ type: 'resize-handle', event: pinnedStart, resizeHandle: 'end' }),
    ).toBe(true);
  });

  it('resizeEvent:false denies both edges, whatever the item says', async () => {
    await mountWeek({ resizeEvent: false });
    const bothOk = { ...EV, resizable: { start: true, end: true } };
    expect(pointerDown({ type: 'resize-handle', event: bothOk, resizeHandle: 'start' })).toBe(
      false,
    );
    expect(pointerDown({ type: 'resize-handle', event: bothOk, resizeHandle: 'end' })).toBe(false);
    // …and it does not leak into moving.
    expect(pointerDown({ type: 'event', event: bothOk })).toBe(true);
  });

  it('selectRange alone keeps slot drags possible when createEvent is off', async () => {
    await mountWeek({ createEvent: false, selectRange: true });
    expect(pointerDown({ type: 'slot' })).toBe(true);
  });
});

/**
 * M22 (R14) — event-delete gets its pointer face: a real delete button per
 * popover row, sibling of the event button (nesting inside it would be a
 * nested interactive — both are buttons).
 */
describe('mp-scheduler — popover delete buttons (M22)', () => {
  let el: MpScheduler;
  afterEach(() => el?.remove());

  const EVENTS = [
    { id: 'a', title: 'Standup', start: new Date(2026, 4, 12, 9, 0), end: new Date(2026, 4, 12, 9, 30) },
    { id: 'b', title: 'Lunch', start: new Date(2026, 4, 12, 12, 0), end: new Date(2026, 4, 12, 13, 0) },
    { id: 'c', title: 'Retro', start: new Date(2026, 4, 12, 15, 0), end: new Date(2026, 4, 12, 16, 0) },
  ];

  const settle = async () => {
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();
  };

  const mountMonthPopover = async (options: Record<string, unknown> = {}) => {
    el = document.createElement('mp-scheduler') as MpScheduler;
    el.setAttribute('locale', 'en-US'); // deterministic dates; see mount()
    document.body.appendChild(el);
    (el as unknown as { date: Date }).date = new Date(2026, 4, 12);
    (el as unknown as { events: unknown[] }).events = EVENTS;
    (el as unknown as { options: unknown }).options = options;
    el.setAttribute('view', 'month');
    await settle();
    el.shadowRoot!.querySelector<HTMLElement>('#scheduler-cell-m-2026-05-12')!.click();
    await settle();
    return el;
  };

  const popover = () => el.shadowRoot!.querySelector('.scheduler-day-popover');

  it('each row carries a named delete button; deleteEvent:false renders none', async () => {
    await mountMonthPopover();
    const buttons = popover()!.querySelectorAll('.popover-event-delete');
    expect(buttons.length).toBe(EVENTS.length);
    expect(buttons[1].getAttribute('aria-label')).toBe('Delete Lunch');
    el.remove();

    await mountMonthPopover({ permissions: { deleteEvent: false } });
    expect(popover()).not.toBeNull();
    expect(popover()!.querySelectorAll('.popover-event-delete').length).toBe(0);
  });

  it('clicking delete emits event-delete, keeps the popover open, and moves focus to the next row', async () => {
    await mountMonthPopover();
    let deleted: string | null = null;
    el.addEventListener('event-delete', (e) => {
      deleted = (e as CustomEvent).detail.event.id;
      // The consumer applies the removal — the WC owns no data.
      (el as unknown as { events: unknown[] }).events = EVENTS.filter(
        (ev) => ev.id !== deleted,
      );
    });
    const rows = popover()!.querySelectorAll<HTMLElement>('.popover-event-delete');
    rows[1].click(); // delete "Lunch"
    await settle();
    await nextRaf();

    expect(deleted).toBe('b');
    expect(popover()).not.toBeNull();
    // Two rows left, focus parked on the one that took the deleted row's place.
    const remaining = popover()!.querySelectorAll('.popover-event');
    expect(remaining.length).toBe(2);
    expect(el.shadowRoot!.activeElement?.getAttribute('aria-label')).toContain('Retro');
  });
});
