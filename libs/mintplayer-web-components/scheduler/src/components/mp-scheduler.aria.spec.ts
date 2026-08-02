import { afterEach, describe, expect, it } from 'vitest';
import './mp-scheduler';
import type { MpScheduler } from './mp-scheduler';

async function nextRaf(): Promise<void> {
  return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
}

async function mount(view: 'timeline' | 'week' | 'day' | 'month' | 'year' = 'timeline'): Promise<MpScheduler> {
  const el = document.createElement('mp-scheduler') as MpScheduler;
  el.setAttribute('locale', 'en-US'); // deterministic dates; see mount()
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
  // Pin the locale. DEFAULT_OPTIONS.locale used to be the literal 'en-US', which
  // silently made every spec deterministic; it is now undefined so the component
  // follows the browser, and an unpinned spec would assert the MACHINE's locale
  // ("mei 2026" on this dev box, "May 2026" in a US CI). Tests that care about
  // localization set their own locale explicitly.
  el.setAttribute('locale', 'en-US');
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

describe('mp-scheduler — resize handles + glyphs (PRD scheduler-resize-glyphs)', () => {
  let el: MpScheduler;
  afterEach(() => el?.remove());

  it('handles are decorative pointer targets: no role, no tabindex, glyph aria-hidden', async () => {
    el = await mount('timeline');
    const handles = el.shadowRoot!.querySelectorAll<HTMLElement>('.scheduler-timeline-event .resize-handle');
    expect(handles.length).toBe(2);
    for (const h of Array.from(handles)) {
      expect(h.getAttribute('role')).toBeNull();
      expect(h.getAttribute('tabindex')).toBeNull();
      expect(h.dataset['handle']).toMatch(/^(start|end)$/);
      const glyph = h.querySelector('.resize-glyph')!;
      expect(glyph).not.toBeNull();
      expect(glyph.getAttribute('aria-hidden')).toBe('true');
    }
  });

  it('glyph visibility is gated on the .selected class written with aria-pressed', async () => {
    el = await mount('timeline');
    const before = el.shadowRoot!.querySelector('.scheduler-timeline-event')!;
    expect(before.classList.contains('selected')).toBe(false);
    expect(before.getAttribute('aria-pressed')).toBe('false');
    const resources = (el as unknown as { resources: { events: { id: string }[] }[] }).resources;
    (el as unknown as { stateManager: { setSelectedEvent: (e: unknown) => void } })
      .stateManager.setSelectedEvent(resources[0].events[0]);
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();
    const after = el.shadowRoot!.querySelector('.scheduler-timeline-event')!;
    // .selected and aria-pressed flip in the SAME render — the CSS keys the
    // glyph reveal and the 24/44px strip growth off .selected.
    expect(after.classList.contains('selected')).toBe(true);
    expect(after.getAttribute('aria-pressed')).toBe('true');
    expect(after.querySelectorAll('.resize-glyph').length).toBe(2);
  });
});

describe('mp-scheduler — keymap instructions (FR-9)', () => {
  let el: MpScheduler;
  afterEach(() => el?.remove());

  it('grid carries aria-describedby resolving to a non-empty instructions div', async () => {
    el = await mount('timeline');
    const grid = el.shadowRoot!.querySelector('.scheduler-timeline')!;
    const id = grid.getAttribute('aria-describedby')!;
    expect(id).toBe('scheduler-kbd-grid');
    const div = el.shadowRoot!.getElementById(id)!;
    expect(div).not.toBeNull();
    expect((div.textContent ?? '').trim().length).toBeGreaterThan(20);
  });

  it('every event carries the move/resize hint via aria-describedby', async () => {
    el = await mount('timeline');
    const ev = el.shadowRoot!.querySelector('.scheduler-timeline-event')!;
    const id = ev.getAttribute('aria-describedby')!;
    expect(id).toBe('scheduler-kbd-event');
    const div = el.shadowRoot!.getElementById(id)!;
    expect(div.textContent).toContain('M');
    expect((div.textContent ?? '').trim().length).toBeGreaterThan(20);
  });

  it('week/timeline grids are aria-multiselectable (Shift+Arrow range selection)', async () => {
    el = await mount('timeline');
    expect(
      el.shadowRoot!.querySelector('.scheduler-timeline')!.getAttribute('aria-multiselectable'),
    ).toBe('true');
    el.remove();
    el = await mount('week');
    const grid = el.shadowRoot!.querySelector('[role="grid"]')!;
    expect(grid.getAttribute('aria-multiselectable')).toBe('true');
  });
});

describe('mp-scheduler — options.messages localization (FR-12)', () => {
  let el: MpScheduler;
  afterEach(() => el?.remove());

  it('overridden messages land in labels, instructions and grid label', async () => {
    el = document.createElement('mp-scheduler') as MpScheduler;
    el.setAttribute('locale', 'en-US'); // deterministic dates; see mount()
    document.body.appendChild(el);
    (el as unknown as { options: unknown }).options = {
      messages: {
        previousPeriod: 'Vorige periode',
        gridInstructions: 'Aangepaste rasterinstructies',
        timelineGridLabel: 'Tijdlijn vanaf {date}',
        resourcesHeader: 'Middelen',
      },
    };
    (el as unknown as { resources: unknown[] }).resources = [
      { id: 'alice', title: 'Alice', events: [] },
    ];
    (el as unknown as { date: Date }).date = new Date(2026, 4, 11);
    el.setAttribute('view', 'timeline');
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();

    const prev = el.shadowRoot!.querySelector('.scheduler-nav button')!;
    expect(prev.getAttribute('aria-label')).toBe('Vorige periode');
    expect(el.shadowRoot!.getElementById('scheduler-kbd-grid')!.textContent)
      .toContain('Aangepaste rasterinstructies');
    const grid = el.shadowRoot!.querySelector('.scheduler-timeline')!;
    expect(grid.getAttribute('aria-label')).toMatch(/^Tijdlijn vanaf /);
    expect(el.shadowRoot!.querySelector('.scheduler-resource-header')!.textContent).toBe('Middelen');
  });
});

describe('mp-scheduler — month/year focus is not selection (audit MAJOR)', () => {
  let el: MpScheduler;
  afterEach(() => el?.remove());

  it('month day cells never carry aria-selected', async () => {
    el = await mount('month');
    const cells = el.shadowRoot!.querySelectorAll('.scheduler-month-day');
    expect(cells.length).toBeGreaterThan(27);
    for (const c of Array.from(cells)) {
      expect(c.getAttribute('aria-selected')).toBeNull();
    }
    // Roving tabindex still expresses focus: exactly one tab stop.
    expect(el.shadowRoot!.querySelectorAll('.scheduler-month-day[tabindex="0"]').length).toBe(1);
  });

  it('year month cards never carry aria-selected', async () => {
    el = await mount('year');
    const cards = el.shadowRoot!.querySelectorAll('.scheduler-year-month');
    expect(cards.length).toBe(12);
    for (const c of Array.from(cards)) {
      expect(c.getAttribute('aria-selected')).toBeNull();
    }
    expect(el.shadowRoot!.querySelectorAll('.scheduler-year-month[tabindex="0"]').length).toBe(1);
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
    // Selection is the button's toggle state (Phase E): aria-pressed, always
    // written — aria-current was the wrong token and aria-selected is
    // invalid on role="button".
    expect(ev2.getAttribute('aria-pressed')).toBe('true');
    expect(ev2.getAttribute('aria-current')).toBeNull();
  });
});
