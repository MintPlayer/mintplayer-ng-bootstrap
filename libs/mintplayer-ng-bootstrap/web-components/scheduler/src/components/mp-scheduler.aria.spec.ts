import { afterEach, describe, expect, it } from 'vitest';
import './mp-scheduler';
import type { MpScheduler } from './mp-scheduler';

async function nextRaf(): Promise<void> {
  return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
}

async function mount(view: 'timeline' | 'week' | 'day' = 'timeline'): Promise<MpScheduler> {
  const el = document.createElement('mp-scheduler') as MpScheduler;
  document.body.appendChild(el);
  // Provide a minimal, deterministic resource + event so timeline-view has
  // structure to assert against. Set after append so the shadow root is ready.
  (el as unknown as { resources: unknown[] }).resources = [
    { id: 'alice', title: 'Alice', events: [
      {
        id: 'standup',
        title: 'Standup',
        start: new Date(2026, 4, 11, 9, 0),
        end: new Date(2026, 4, 11, 9, 30),
        resourceId: 'alice',
      },
    ] },
  ];
  (el as unknown as { date: Date }).date = new Date(2026, 4, 11);
  el.setAttribute('view', view);
  await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
  await nextRaf();
  return el;
}

describe('mp-scheduler — header ARIA', () => {
  let el: MpScheduler;
  afterEach(() => el?.remove());

  it('nav buttons have aria-label', async () => {
    el = await mount();
    const nav = el.shadowRoot!.querySelector('.scheduler-nav')!;
    const prev = nav.querySelector<HTMLButtonElement>('button:nth-of-type(1)')!;
    const next = nav.querySelector<HTMLButtonElement>('button:nth-of-type(2)')!;
    const today = nav.querySelector<HTMLButtonElement>('button:nth-of-type(3)')!;
    expect(prev.getAttribute('aria-label')).toBe('Previous period');
    expect(next.getAttribute('aria-label')).toBe('Next period');
    expect(today.getAttribute('aria-label')).toBe('Jump to today');
  });

  it('view-switcher exposes role="group" + aria-label', async () => {
    el = await mount();
    const sw = el.shadowRoot!.querySelector('.scheduler-view-switcher')!;
    expect(sw.getAttribute('role')).toBe('group');
    expect(sw.getAttribute('aria-label')).toBe('Switch view');
  });

  it('view-switcher buttons mirror active state via aria-pressed', async () => {
    el = await mount('timeline');
    const buttons = Array.from(el.shadowRoot!.querySelectorAll<HTMLButtonElement>('.scheduler-view-switcher button'));
    const timeline = buttons.find((b) => b.dataset['view'] === 'timeline')!;
    const week = buttons.find((b) => b.dataset['view'] === 'week')!;
    expect(timeline.getAttribute('aria-pressed')).toBe('true');
    expect(week.getAttribute('aria-pressed')).toBe('false');
  });
});

describe('mp-scheduler — timeline-view grid roles', () => {
  let el: MpScheduler;
  afterEach(() => el?.remove());

  it('timeline container is role="grid" with a label and aria-rowcount', async () => {
    el = await mount('timeline');
    const grid = el.shadowRoot!.querySelector('.scheduler-timeline')!;
    expect(grid.getAttribute('role')).toBe('grid');
    expect(grid.getAttribute('aria-label')).toContain('Resource timeline');
    expect(Number(grid.getAttribute('aria-rowcount'))).toBeGreaterThanOrEqual(2);
  });

  it('day-header cells are role="columnheader"', async () => {
    el = await mount('timeline');
    const headers = el.shadowRoot!.querySelectorAll('.scheduler-timeline-slots-header .scheduler-timeline-slot-header');
    expect(headers.length).toBeGreaterThan(0);
    for (const h of Array.from(headers)) {
      expect(h.getAttribute('role')).toBe('columnheader');
    }
  });

  it('resource cell is role="rowheader"', async () => {
    el = await mount('timeline');
    const cell = el.shadowRoot!.querySelector('.scheduler-resource-cell')!;
    expect(cell.getAttribute('role')).toBe('rowheader');
  });

  it('time-slot cells are role="gridcell" with a roving tabindex', async () => {
    el = await mount('timeline');
    const slots = el.shadowRoot!.querySelectorAll('.scheduler-timeline-slot');
    expect(slots.length).toBeGreaterThan(0);
    // Every cell must be role=gridcell and have either tabindex=0 (the focused
    // tab stop) or tabindex=-1 (other cells). PRD §6.2 — roving tabindex.
    for (const s of Array.from(slots)) {
      expect(s.getAttribute('role')).toBe('gridcell');
      expect(s.getAttribute('tabindex')).toMatch(/^(0|-1)$/);
    }
    // Exactly one cell carries tabindex=0 (the grid's single tab stop).
    const tabbable = el.shadowRoot!.querySelectorAll('.scheduler-timeline-slot[tabindex="0"]');
    expect(tabbable.length).toBe(1);
  });
});

describe('mp-scheduler — event blocks', () => {
  let el: MpScheduler;
  afterEach(() => el?.remove());

  it('timeline event block is role="button" with descriptive aria-label', async () => {
    el = await mount('timeline');
    const ev = el.shadowRoot!.querySelector('.scheduler-timeline-event');
    expect(ev).not.toBeNull();
    expect(ev!.getAttribute('role')).toBe('button');
    // PRD §6.1 D3: every event is in the Tab order (flipped from roving).
    expect(ev!.getAttribute('tabindex')).toBe('0');
    const label = ev!.getAttribute('aria-label') ?? '';
    expect(label).toContain('Standup');
    expect(label).toContain('Alice');
  });
});

describe('mp-scheduler — live announcer', () => {
  let el: MpScheduler;
  afterEach(() => el?.remove());

  it('renders a polite role="status" region in the shadow tree', async () => {
    el = await mount();
    const live = el.shadowRoot!.querySelector('[role="status"]');
    expect(live).not.toBeNull();
    expect(live!.getAttribute('aria-live')).toBe('polite');
  });
});

describe('mp-scheduler — events in tab order (PRD D3)', () => {
  let el: MpScheduler;
  afterEach(() => el?.remove());

  it('every event carries tabindex="0", regardless of selection state', async () => {
    el = await mount('timeline');
    const ev = el.shadowRoot!.querySelector('.scheduler-timeline-event')!;
    expect(ev.getAttribute('tabindex')).toBe('0');
    // Selecting it shouldn't change tabindex (no longer roving).
    const resources = (el as unknown as { resources: { events: { id: string }[] }[] }).resources;
    const event = resources[0].events[0];
    (el as unknown as { stateManager: { setSelectedEvent: (e: unknown) => void } }).stateManager.setSelectedEvent(event);
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
    const ev2 = el.shadowRoot!.querySelector('.scheduler-timeline-event')!;
    expect(ev2.getAttribute('tabindex')).toBe('0');
    expect(ev2.getAttribute('aria-current')).toBe('true');
  });
});
