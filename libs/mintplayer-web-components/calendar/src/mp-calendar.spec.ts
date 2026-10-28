import { afterEach, describe, expect, it } from 'vitest';
import { MpCalendar } from './generated';

void MpCalendar; // force the side-effect registration

/**
 * The Lit calendar front (#437): light DOM, rendered from the template
 * compiled out of `@mintplayer/ui-core/calendar`. The core's spec covers the
 * date math, the keymap and the bags; this file pins the element: clicks and
 * keys select, move focus across months and report.
 */

const frame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

async function settle(el: MpCalendar): Promise<void> {
  await el.updateComplete;
  await Promise.resolve();
  await el.updateComplete;
  await frame();
}

async function mount(setup: (el: MpCalendar) => void = () => undefined): Promise<MpCalendar> {
  const el = document.createElement('mp-calendar') as MpCalendar;
  el.selectedDate = new Date(2026, 4, 13);
  setup(el);
  document.body.append(el);
  await settle(el);
  return el;
}

const day = (el: MpCalendar, date: string) => el.querySelector(`[data-date="${date}"]`) as HTMLElement;
const roving = (el: MpCalendar) => el.querySelector<HTMLElement>('[data-date][tabindex="0"]')?.dataset['date'];
const key = (target: HTMLElement, k: string, init: KeyboardEventInit = {}) => {
  const ev = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(ev);
  return ev;
};
const events = (el: MpCalendar, name: string) => {
  const seen: string[] = [];
  el.addEventListener(name, (e) => {
    const d = (e as CustomEvent<Date>).detail;
    seen.push(`${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`);
  });
  return seen;
};

afterEach(() => {
  document.body.innerHTML = '';
});

describe('mp-calendar', () => {
  it('renders the selected month in the light DOM, with one roving day', async () => {
    const el = await mount();
    expect(el.shadowRoot).toBeNull();
    expect(el.querySelector('[role=grid]')).not.toBeNull();
    expect(el.querySelector('.calendar-month-label')?.textContent?.trim()).toMatch(/2026$/);
    expect(roving(el)).toBe('2026-05-13');
    expect((el.querySelector('.calendar-chevron-previous') as HTMLButtonElement).disabled).toBe(false);
  });

  it('a click selects a day and reports it', async () => {
    const el = await mount();
    const seen = events(el, 'selecteddatechange');
    day(el, '2026-05-20').click();
    await settle(el);
    expect(seen).toEqual(['2026-5-20']);
    expect(el.selectedDate?.getDate()).toBe(20);
    expect(day(el, '2026-05-20').getAttribute('aria-selected')).toBe('true');
  });

  it('a click on a disabled day does nothing', async () => {
    const el = await mount((c) => (c.max = new Date(2026, 4, 15)));
    const seen = events(el, 'selecteddatechange');
    day(el, '2026-05-20').click();
    await settle(el);
    expect(seen).toEqual([]);
  });

  it('arrows move focus without selecting; crossing the month reports it', async () => {
    const el = await mount((c) => (c.selectedDate = new Date(2026, 4, 1)));
    const months = events(el, 'currentmonthchange');
    const selected = events(el, 'selecteddatechange');
    day(el, '2026-05-01').focus();
    expect(key(day(el, '2026-05-01'), 'ArrowRight').defaultPrevented).toBe(true);
    await settle(el);
    expect(document.activeElement).toBe(day(el, '2026-05-02'));
    key(day(el, '2026-05-02'), 'ArrowLeft');
    key(day(el, '2026-05-01'), 'ArrowLeft');
    await settle(el);
    await frame();
    expect(months).toEqual(['2026-4-1']);
    expect(document.activeElement).toBe(day(el, '2026-04-30'));
    expect(roving(el)).toBe('2026-04-30');
    expect(selected).toEqual([]);
  });

  it('Enter and Space select the focused day; other keys are left alone', async () => {
    const el = await mount();
    const seen = events(el, 'selecteddatechange');
    key(day(el, '2026-05-14'), 'Enter');
    key(day(el, '2026-05-15'), ' ');
    expect(key(day(el, '2026-05-15'), 'a').defaultPrevented).toBe(false);
    await settle(el);
    expect(seen).toEqual(['2026-5-14', '2026-5-15']);
  });

  it('the month buttons and methods page the month and report it', async () => {
    const el = await mount();
    const months = events(el, 'currentmonthchange');
    (el.querySelector('.calendar-chevron-next') as HTMLButtonElement).click();
    await settle(el);
    el.previousMonth();
    el.previousMonth();
    await settle(el);
    expect(months).toEqual(['2026-6-1', '2026-5-1', '2026-4-1']);
    expect(el.currentMonth?.getMonth()).toBe(3);
  });

  it('follows a written month and selection', async () => {
    const el = await mount();
    el.currentMonth = new Date(2027, 1, 10);
    el.selectedDate = new Date(2027, 1, 3);
    await settle(el);
    expect(roving(el)).toBe('2027-02-03');
  });

  it('focusGrid() lands on the roving day', async () => {
    const el = await mount();
    el.focusGrid();
    expect(document.activeElement).toBe(day(el, '2026-05-13'));
  });

  it('orders the weekday header from first-day-of-week', async () => {
    const el = await mount((c) => {
      c.locale = 'en-US';
      c.setAttribute('first-day-of-week', '0');
    });
    const headers = [...el.querySelectorAll('[role=columnheader][title]')].map((th) => th.getAttribute('title'));
    expect(headers[0]).toBe('Sunday');
  });
});
