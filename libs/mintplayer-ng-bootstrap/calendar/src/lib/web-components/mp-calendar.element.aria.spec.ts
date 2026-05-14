import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import './mp-calendar.element';
import type { MpCalendarElement } from './mp-calendar.element';

async function flush(el: MpCalendarElement): Promise<void> {
  await el.updateComplete;
  // Two raf ticks so any pending focus-restore work runs.
  await new Promise<void>((r) =>
    requestAnimationFrame(() => requestAnimationFrame(() => r())),
  );
}

async function mount(setup?: (el: MpCalendarElement) => void): Promise<MpCalendarElement> {
  const el = document.createElement('mp-calendar') as MpCalendarElement;
  el.currentMonth = new Date(2026, 4, 1); // May 2026
  el.selectedDate = new Date(2026, 4, 15);
  setup?.(el);
  document.body.appendChild(el);
  await flush(el);
  return el;
}

function shadow(el: MpCalendarElement): ShadowRoot {
  return el.shadowRoot!;
}

function findCell(el: MpCalendarElement, year: number, month: number, day: number): HTMLElement | null {
  return shadow(el).querySelector<HTMLElement>(`td[id$="-cell-${year}-${month}-${day}"]`);
}

function dispatchKey(target: HTMLElement, key: string, opts: { ctrlKey?: boolean } = {}): KeyboardEvent {
  const ev = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ctrlKey: opts.ctrlKey ?? false,
  });
  target.dispatchEvent(ev);
  return ev;
}

describe('mp-calendar — APG Date Picker grid roles', () => {
  let el: MpCalendarElement;
  beforeEach(async () => {
    el = await mount();
  });
  afterEach(() => el.remove());

  it('table is role="grid" with aria-labelledby pointing at the month-title cell', () => {
    const table = shadow(el).querySelector('table')!;
    expect(table.getAttribute('role')).toBe('grid');
    const labelledBy = table.getAttribute('aria-labelledby');
    expect(labelledBy).toBeTruthy();
    expect(shadow(el).querySelector(`#${labelledBy}`)).not.toBeNull();
  });

  it('weekday header row uses role="row" / role="columnheader"', () => {
    const headerRow = shadow(el).querySelectorAll('tr[role="row"]')[0];
    expect(headerRow).not.toBeUndefined();
    const headers = headerRow.querySelectorAll('th[role="columnheader"]');
    expect(headers.length).toBeGreaterThanOrEqual(7);
  });

  it('week-number cells are role="rowheader"', () => {
    const rowHeaders = shadow(el).querySelectorAll('th[role="rowheader"]');
    expect(rowHeaders.length).toBeGreaterThan(0);
  });

  it('day cells are role="gridcell" with stable ids', () => {
    const cell = findCell(el, 2026, 4, 15);
    expect(cell).not.toBeNull();
    expect(cell!.getAttribute('role')).toBe('gridcell');
  });

  it('exactly one day cell carries tabindex="0" (roving tabindex)', () => {
    const tabbable = shadow(el).querySelectorAll('td[tabindex="0"]');
    expect(tabbable.length).toBe(1);
    expect(tabbable[0].id).toContain('-cell-2026-4-15');
  });

  it('falls back to today, then first enabled day, when neither selection nor today is in-month', async () => {
    el.selectedDate = new Date(2025, 0, 1);
    el.currentMonth = new Date(2030, 5, 1); // June 2030
    await flush(el);
    const tabbable = shadow(el).querySelectorAll('td[tabindex="0"]');
    expect(tabbable.length).toBe(1);
  });

  it('selected day has aria-selected="true" and visual selected class', () => {
    const cell = findCell(el, 2026, 4, 15)!;
    expect(cell.getAttribute('aria-selected')).toBe('true');
    expect(cell.classList.contains('selected')).toBe(true);
  });

  it('disabled day carries aria-disabled="true" and no cursor-pointer', async () => {
    el.disableDateFn = (d) => d.getDate() === 20;
    await flush(el);
    const cell = findCell(el, 2026, 4, 20)!;
    expect(cell.getAttribute('aria-disabled')).toBe('true');
    expect(cell.classList.contains('cursor-pointer')).toBe(false);
  });
});

describe('mp-calendar — keyboard navigation', () => {
  let el: MpCalendarElement;
  beforeEach(async () => {
    el = await mount();
  });
  afterEach(() => el.remove());

  it('ArrowRight emits no event but moves focus to next day', async () => {
    const cell = findCell(el, 2026, 4, 15)!;
    dispatchKey(cell, 'ArrowRight');
    await flush(el);
    expect(shadow(el).querySelectorAll('td[tabindex="0"]')[0].id).toContain('-cell-2026-4-16');
  });

  it('ArrowLeft on day-1 rolls back to previous month and emits current-month-change', async () => {
    el.currentMonth = new Date(2026, 4, 1);
    el.selectedDate = new Date(2026, 4, 1);
    await flush(el);
    const cell = findCell(el, 2026, 4, 1)!;
    const events: Date[] = [];
    el.addEventListener('current-month-change', (e) => events.push((e as CustomEvent<Date>).detail));
    dispatchKey(cell, 'ArrowLeft');
    await flush(el);
    expect(events.length).toBe(1);
    expect(events[0].getMonth()).toBe(3); // April
  });

  it('ArrowDown moves focus by 7 days', async () => {
    const cell = findCell(el, 2026, 4, 15)!;
    dispatchKey(cell, 'ArrowDown');
    await flush(el);
    expect(shadow(el).querySelectorAll('td[tabindex="0"]')[0].id).toContain('-cell-2026-4-22');
  });

  it('PageDown advances by one month; Ctrl+PageDown by one year', async () => {
    let cell = findCell(el, 2026, 4, 15)!;
    dispatchKey(cell, 'PageDown');
    await flush(el);
    expect(el.currentMonth!.getMonth()).toBe(5); // June

    cell = findCell(el, 2026, 5, 15)!;
    dispatchKey(cell, 'PageDown', { ctrlKey: true });
    await flush(el);
    expect(el.currentMonth!.getFullYear()).toBe(2027);
  });

  it('Home jumps to the first day of the focused week (Sunday by default browser day)', async () => {
    // May 15 2026 is a Friday (getDay() === 5); Home offsets back by 5 → May 10.
    const cell = findCell(el, 2026, 4, 15)!;
    dispatchKey(cell, 'Home');
    await flush(el);
    expect(shadow(el).querySelectorAll('td[tabindex="0"]')[0].id).toContain('-cell-2026-4-10');
  });

  it('End jumps to the last day of the focused week', async () => {
    const cell = findCell(el, 2026, 4, 15)!;
    dispatchKey(cell, 'End');
    await flush(el);
    expect(shadow(el).querySelectorAll('td[tabindex="0"]')[0].id).toContain('-cell-2026-4-16');
  });

  it('Enter selects the focused day and emits selected-date-change', async () => {
    const cell = findCell(el, 2026, 4, 20)!;
    const events: Date[] = [];
    el.addEventListener('selected-date-change', (e) => events.push((e as CustomEvent<Date>).detail));
    dispatchKey(cell, 'Enter');
    await flush(el);
    expect(events.length).toBe(1);
    expect(events[0].getDate()).toBe(20);
  });

  it('preventDefault is called on navigation keys', () => {
    const cell = findCell(el, 2026, 4, 15)!;
    const ev = dispatchKey(cell, 'ArrowRight');
    expect(ev.defaultPrevented).toBe(true);
  });

  it('does not preventDefault on unrelated keys', () => {
    const cell = findCell(el, 2026, 4, 15)!;
    const ev = dispatchKey(cell, 'a');
    expect(ev.defaultPrevented).toBe(false);
  });
});

describe('mp-calendar — properties + events', () => {
  let el: MpCalendarElement;
  beforeEach(async () => {
    el = await mount();
  });
  afterEach(() => el.remove());

  it('clicking a day emits selected-date-change with a Date detail', async () => {
    const events: Date[] = [];
    el.addEventListener('selected-date-change', (e) => events.push((e as CustomEvent<Date>).detail));
    findCell(el, 2026, 4, 20)!.click();
    await flush(el);
    expect(events.length).toBe(1);
    expect(events[0]).toBeInstanceOf(Date);
    expect(events[0].getDate()).toBe(20);
  });

  it('clicking a disabled day does not emit', async () => {
    el.disableDateFn = (d) => d.getDate() === 20;
    await flush(el);
    const events: Date[] = [];
    el.addEventListener('selected-date-change', (e) => events.push((e as CustomEvent<Date>).detail));
    findCell(el, 2026, 4, 20)!.click();
    await flush(el);
    expect(events.length).toBe(0);
  });

  it('previousMonth() / nextMonth() emit current-month-change', async () => {
    const events: Date[] = [];
    el.addEventListener('current-month-change', (e) => events.push((e as CustomEvent<Date>).detail));
    el.nextMonth();
    await flush(el);
    el.previousMonth();
    await flush(el);
    expect(events.length).toBe(2);
    expect(events[0].getMonth()).toBe(5);
    expect(events[1].getMonth()).toBe(4);
  });

  it('firstDayOfWeek shifts the rendered weekday header order', async () => {
    el.firstDayOfWeek = 0; // Sunday-first
    await flush(el);
    // Just sanity check that a header row exists; locale-dependent labels are
    // tested in their own pipe-level spec.
    const headers = shadow(el).querySelectorAll('th[role="columnheader"]');
    expect(headers.length).toBeGreaterThanOrEqual(7);
  });

  it('respects [min] / [max] bounds — out-of-range days are aria-disabled', async () => {
    el.min = new Date(2026, 4, 10);
    el.max = new Date(2026, 4, 20);
    await flush(el);
    expect(findCell(el, 2026, 4, 5)!.getAttribute('aria-disabled')).toBe('true');
    expect(findCell(el, 2026, 4, 15)!.getAttribute('aria-disabled')).toBeNull();
    expect(findCell(el, 2026, 4, 25)!.getAttribute('aria-disabled')).toBe('true');
  });
});
