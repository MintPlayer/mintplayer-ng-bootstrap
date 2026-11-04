import { applyBag, el, hostCore } from '../../_conformance/host-core';
import type { CalendarView } from './calendar';
import { calendarCore, type CalendarInputs } from './calendar.core';
import { focusCalendarCell } from './calendar.behaviour';

const day = (m: number, d: number) => new Date(2026, m, d);
const iso = (d: Date | null) => (d ? `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}` : null);
const frame = () => new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));

afterEach(() => document.body.replaceChildren());

const inputs = (o: Partial<CalendarInputs> = {}): CalendarInputs => ({
  selectedDate: day(2, 10),
  currentMonth: null,
  min: null,
  max: null,
  disableDateFn: null,
  firstDayOfWeek: 1,
  locale: 'en-GB',
  labels: null,
  ...o,
});

const markup = ({ view }: { view: CalendarView }, host: HTMLElement) => {
  applyBag(host, view.root);
  return [
    el('div', view.nav, el('button', view.previous), el('span', view.monthLabel, view.monthText), el('button', view.next)),
    el('table', view.grid, el('tbody', null, ...view.weeks.map((w) => el('tr', w.row, ...w.cells.map((c) => el('td', c.cell, c.content && el('span', c.content, c.text))))))),
  ];
};

function mount(o: Partial<CalendarInputs> = {}) {
  const h = hostCore(calendarCore, inputs(o), { markup });
  h.attach();
  const cell = (d: Date) => h.host.querySelector<HTMLElement>(`[data-date="${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}"]`);
  const key = (target: HTMLElement, key: string) => {
    const ev = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    target.dispatchEvent(ev);
    return ev;
  };
  return { ...h, cell, key };
}

describe('calendarCore', () => {
  it('shows the selected day’s month and selects a clicked day', () => {
    const h = mount();
    expect(h.state().currentMonth).toEqual(day(2, 1));
    h.cell(day(2, 12))!.click();
    expect(iso(h.state().selectedDate)).toBe('2026-3-12');
    expect(h.events('selectedDateChange')).toHaveLength(1);
    expect(h.events('currentMonthChange')).toEqual([]);
    h.host.click();
    expect(h.events('selectedDateChange')).toHaveLength(1);
  });

  it('refuses a disabled day by click, key and method', () => {
    const h = mount({ disableDateFn: (d) => d.getDate() === 13 });
    h.cell(day(2, 13))!.click();
    h.key(h.cell(day(2, 13))!, 'Enter');
    h.call('select', day(2, 13));
    expect(h.events('selectedDateChange')).toEqual([]);
    h.call('select', day(4, 3));
    expect(iso(h.state().selectedDate)).toBe('2026-5-3');
    expect(h.events('currentMonthChange')).toEqual([day(4, 1)]);
  });

  it('pages months with the buttons and the methods', () => {
    const h = mount();
    h.host.querySelector<HTMLElement>('[data-calendar-action="next"]')!.click();
    expect(h.state().currentMonth).toEqual(day(3, 1));
    h.render();
    h.host.querySelector<HTMLElement>('[data-calendar-action="previous"]')!.click();
    h.call('previousMonth');
    expect(h.state().currentMonth).toEqual(day(1, 1));
    h.call('nextMonth');
    expect(h.events('currentMonthChange')).toEqual([day(3, 1), day(2, 1), day(1, 1), day(2, 1)]);
  });

  it('moves the roving day with the keys, crossing into another month, and selects with Space', async () => {
    const h = mount();
    expect(h.key(h.cell(day(2, 10))!, 'ArrowRight').defaultPrevented).toBe(true);
    expect(iso(h.state().focusedDate)).toBe('2026-3-11');
    expect(document.activeElement).toBe(h.cell(day(2, 11)));
    expect(h.key(h.cell(day(2, 11))!, 'x').defaultPrevented).toBe(false);

    h.key(h.cell(day(2, 31))!, 'ArrowDown');
    expect(h.state().currentMonth).toEqual(day(3, 1));
    h.render();
    await frame();
    expect(document.activeElement).toBe(h.cell(day(3, 7)));

    h.key(h.cell(day(3, 7))!, ' ');
    expect(iso(h.state().selectedDate)).toBe('2026-4-7');
    h.key(h.host, 'ArrowRight');
  });

  it('focuses the roving cell through its method, and gives up on a cell that never renders', async () => {
    const h = mount();
    h.render();
    h.call('focusGrid');
    expect(document.activeElement).toBe(h.cell(day(2, 10)));
    focusCalendarCell(h.host, '1999-01-01', 1);
    await frame();
    await frame();
    expect(document.activeElement).toBe(h.cell(day(2, 10)));
    h.host.replaceChildren();
    h.call('focusGrid');
  });

  it('follows the consumer’s day and month', () => {
    const h = mount({ currentMonth: day(6, 9) });
    expect(h.state().currentMonth).toEqual(day(6, 1));
    h.setInputs({ selectedDate: day(2, 10) });
    h.setInputs({ selectedDate: new Date(2026, 2, 10, 12) });
    expect(iso(h.state().selectedDate)).toBe('2026-3-10');
    h.setInputs({ selectedDate: day(8, 1), currentMonth: day(8, 20) });
    expect(iso(h.state().selectedDate)).toBe('2026-9-1');
    expect(h.state().currentMonth).toEqual(day(8, 1));
    h.setInputs({ currentMonth: day(8, 2) });
    h.setInputs({ currentMonth: null });
    expect(h.state().currentMonth).toEqual(day(8, 1));
    h.dispose();
  });
});
