import {
  calendarKeyTarget,
  connectCalendar,
  isoDate,
  monthWeeks,
  parseIsoDate,
  rovingDate,
  weekdayNames,
  type CalendarOptions,
  type FirstDayOfWeek,
} from './calendar';

const weekNumbers = (year: number, month: number, firstDayOfWeek: FirstDayOfWeek, locale: string) =>
  monthWeeks(new Date(year, month, 1), firstDayOfWeek, locale).map((w) => w.number);

describe('week numbers follow the week start', () => {
  // The column was hardcoded ISO-8601, which under a Sunday start (en-US,
  // ja-JP) labelled two rows of January 2026 "week 1". It is a real rowheader,
  // so a screen reader read the wrong number aloud.
  it('numbers January 2026 without repeating a week under a Sunday start', () => {
    const numbers = weekNumbers(2026, 0, 0, 'en-US');
    expect(new Set(numbers).size).toBe(numbers.length);
    expect(numbers[0]).toBe(1);
  });

  it('still produces ISO numbering under a Monday start', () => {
    expect(weekNumbers(2026, 0, 1, 'nl-BE').slice(0, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it('increments by exactly one down every month', () => {
    for (const [fdow, locale] of [[0, 'en-US'], [1, 'nl-BE']] as const) {
      for (const month of [0, 5, 11]) {
        const numbers = weekNumbers(2026, month, fdow, locale);
        numbers.slice(1).forEach((n, i) => expect(n === numbers[i] + 1 || (n === 1 && numbers[i] >= 52)).toBe(true));
      }
    }
  });

  it('ends December 2026 in ISO week 53, and December 2024 in week 1', () => {
    expect(weekNumbers(2026, 11, 1, 'nl-BE').at(-1)).toBe(53);
    expect(weekNumbers(2024, 11, 1, 'nl-BE').at(-1)).toBe(1);
  });
});

describe('the grid', () => {
  it('lays a month out in whole weeks from the week start', () => {
    const weeks = monthWeeks(new Date(2026, 4, 1), 1, 'nl-BE');
    expect(weeks.every((w) => w.days.length === 7)).toBe(true);
    expect(weeks[0].days[0].date.getDay()).toBe(1);
    expect(weeks.flatMap((w) => w.days).filter((d) => d.isInMonth)).toHaveLength(31);
  });

  it('orders the weekday names from the week start', () => {
    expect(weekdayNames(0, 'en-US')[0].long).toBe('Sunday');
    expect(weekdayNames(1, 'en-US')[0].long).toBe('Monday');
  });

  it('round-trips ISO dates', () => {
    expect(isoDate(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(parseIsoDate('2026-01-05')?.getTime()).toBe(new Date(2026, 0, 5).getTime());
    expect(parseIsoDate('nope')).toBeNull();
  });
});

describe('rovingDate', () => {
  const may = new Date(2026, 4, 1);
  const weeks = monthWeeks(may, 1, 'nl-BE');
  const none = { min: null, max: null, disableDateFn: null };

  it('prefers the focused, then the selected day, then today, each only in the month', () => {
    const focused = new Date(2026, 4, 9);
    const selected = new Date(2026, 4, 20);
    const today = new Date(2026, 4, 14);
    expect(rovingDate(may, weeks, focused, selected, today, none)).toBe(focused);
    expect(rovingDate(may, weeks, null, selected, today, none)).toBe(selected);
    expect(rovingDate(may, weeks, null, new Date(2026, 3, 2), today, none)).toBe(today);
  });

  it('falls back to the first enabled day', () => {
    const firstEnabled = rovingDate(may, weeks, null, null, new Date(2020, 0, 1), { ...none, min: new Date(2026, 4, 4) });
    expect(isoDate(firstEnabled as Date)).toBe('2026-05-04');
  });
});

describe('calendarKeyTarget', () => {
  const from = new Date(2026, 4, 13); // a Wednesday
  const key = (k: string, o: Partial<{ rtl: boolean; ctrlKey: boolean; firstDayOfWeek: FirstDayOfWeek }> = {}) => {
    const target = calendarKeyTarget(k, from, { firstDayOfWeek: 1, rtl: false, ctrlKey: false, ...o });
    return target && isoDate(target);
  };

  it('moves a day or a week, mirrored in RTL', () => {
    expect([key('ArrowLeft'), key('ArrowRight'), key('ArrowUp'), key('ArrowDown')]).toEqual(['2026-05-12', '2026-05-14', '2026-05-06', '2026-05-20']);
    expect([key('ArrowLeft', { rtl: true }), key('ArrowRight', { rtl: true })]).toEqual(['2026-05-14', '2026-05-12']);
  });

  it('goes to the week edges, honouring the week start', () => {
    expect([key('Home'), key('End')]).toEqual(['2026-05-11', '2026-05-17']);
    expect([key('Home', { firstDayOfWeek: 0 }), key('End', { firstDayOfWeek: 0 })]).toEqual(['2026-05-10', '2026-05-16']);
  });

  it('pages a month, or a year with Ctrl, clamping the day', () => {
    expect([key('PageUp'), key('PageDown'), key('PageDown', { ctrlKey: true })]).toEqual(['2026-04-13', '2026-06-13', '2027-05-13']);
    const jan31 = calendarKeyTarget('PageDown', new Date(2026, 0, 31), { firstDayOfWeek: 1, rtl: false, ctrlKey: false });
    expect(isoDate(jan31 as Date)).toBe('2026-02-28');
  });

  it('leaves other keys alone', () => {
    expect(key('a')).toBeNull();
    expect(key('Tab')).toBeNull();
  });
});

describe('connectCalendar', () => {
  const base: CalendarOptions = {
    id: 'c1',
    month: new Date(2026, 4, 1),
    selected: new Date(2026, 4, 20),
    focused: null,
    today: new Date(2026, 4, 14),
    firstDayOfWeek: 1,
    locale: 'en-US',
    min: null,
    max: null,
    disableDateFn: null,
    hydrated: true,
  };
  const cells = (o: Partial<CalendarOptions> = {}) => connectCalendar({ ...base, ...o }).weeks.flatMap((w) => w.cells);
  const cell = (date: string, o?: Partial<CalendarOptions>) => cells(o).find((c) => c.key === date)!.cell;

  it('labels the grid by the month and the month buttons by name', () => {
    const view = connectCalendar(base);
    expect(view.grid['role']).toBe('grid');
    expect(view.grid['aria-labelledby']).toBe(view.monthLabel['id']);
    expect(view.monthText).toBe('May 2026');
    expect([view.previous['aria-label'], view.next['aria-label']]).toEqual(['Previous month', 'Next month']);
    expect(connectCalendar({ ...base, labels: { previousMonth: 'Vorige maand' } }).previous['aria-label']).toBe('Vorige maand');
  });

  it('gives exactly one day the roving tabindex, and marks selection and today', () => {
    expect(cells().filter((c) => c.cell['tabindex'] === 0).map((c) => c.key)).toEqual(['2026-05-20']);
    expect(cell('2026-05-20')['aria-selected']).toBe('true');
    expect(cell('2026-05-20')['class']).toContain('calendar-day-selected');
    expect(cell('2026-05-14')['aria-current']).toBe('date');
    expect(cell('2026-05-14')['id']).toBe('c1-day-2026-05-14');
  });

  it('disables days outside [min, max] or rejected by disableDateFn', () => {
    const o = { min: new Date(2026, 4, 5), max: new Date(2026, 4, 25), disableDateFn: (d: Date) => d.getDate() === 15 };
    expect(['2026-05-04', '2026-05-15', '2026-05-26'].map((d) => cell(d, o)['aria-disabled'])).toEqual(['true', 'true', 'true']);
    expect(cell('2026-05-10', o)['aria-disabled']).toBeNull();
  });

  it('leaves days of the neighbouring months empty and unfocusable', () => {
    const outside = cells().filter((c) => !c.content);
    expect(outside.length).toBeGreaterThan(0);
    expect(outside.every((c) => c.cell['tabindex'] === undefined && c.text === '')).toBe(true);
  });

  it('is inert before hydration: no tabbable day, disabled month buttons', () => {
    const view = connectCalendar({ ...base, hydrated: false });
    expect(view.weeks.flatMap((w) => w.cells).some((c) => c.cell['tabindex'] != null)).toBe(false);
    expect([view.previous['disabled'], view.next['disabled']]).toEqual([true, true]);
  });
});
