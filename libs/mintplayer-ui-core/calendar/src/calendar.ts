/**
 * The month grid, framework-neutral (PRD #437): an APG date grid of day cells
 * under a month toolbar. Shared by the calendar component and the date pickers,
 * which render the same view from `connectCalendar`.
 *
 * No-JS tier 2: the server renders the month, visible but inert. The month
 * buttons are disabled and no cell is tabbable until the page hydrates, so
 * nothing offers an action it cannot perform; a picker's native input is the
 * no-JS way to enter a date.
 */

export type FirstDayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const CALENDAR_SCOPE = 'calendar';

export type CalendarBag = Record<string, string | number | boolean | null>;

export interface CalendarDay {
  date: Date;
  dayOfMonth: number;
  isInMonth: boolean;
}

export interface CalendarWeek {
  number: number;
  days: CalendarDay[];
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Midnight of the same local day, as a timestamp. */
export const dateOnly = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

export function isSameDate(a: Date | null | undefined, b: Date | null | undefined): boolean {
  if (!a || !b) return !a && !b;
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export const isSameYearMonth = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();

/** The first of the month `d` falls in. */
export const monthOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);

const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const daysBetween = (a: Date, b: Date) => Math.round((dateOnly(b) - dateOnly(a)) / MS_PER_DAY);

/** `YYYY-MM-DD`, the cell's stable key. */
export function isoDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseIsoDate(text: string | null | undefined): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text ?? '');
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}

export function startOfWeek(date: Date, firstDayOfWeek: FirstDayOfWeek): Date {
  return addDays(date, -((date.getDay() - firstDayOfWeek + 7) % 7));
}

export function endOfWeek(date: Date, firstDayOfWeek: FirstDayOfWeek): Date {
  return addDays(date, (firstDayOfWeek + 6 - date.getDay() + 7) % 7);
}

/**
 * How many days of a year a week must contain to count as that year's week 1:
 * ISO says 4 (the Thursday rule), the US convention 1. `Intl` reports it per
 * locale where the engine has it; V8 does not, so the normal path infers it
 * from the week start: the Sunday-start world counts the week holding Jan 1,
 * the Monday-start world follows ISO. Deriving both from one signal keeps them
 * consistent; an ISO count on a Sunday grid repeated "week 1" in January.
 */
export function minimalDaysInFirstWeek(locale: string | null | undefined, firstDayOfWeek: FirstDayOfWeek): number {
  try {
    const lang = locale ?? (typeof navigator === 'undefined' ? 'en' : navigator.language);
    const info = new Intl.Locale(lang) as Intl.Locale & {
      weekInfo?: { minimalDays?: number };
      getWeekInfo?: () => { minimalDays?: number };
    };
    const minimalDays = typeof info.getWeekInfo === 'function' ? info.getWeekInfo()?.minimalDays : info.weekInfo?.minimalDays;
    if (typeof minimalDays === 'number') return minimalDays;
  } catch {
    // Absent in Firefox, and shaped differently across engines.
  }
  return firstDayOfWeek === 1 ? 4 : 1;
}

/** Week of the year, honouring both the week start and the locale's minimal-days rule. */
export function weekOfYear(date: Date, firstDayOfWeek: FirstDayOfWeek, locale: string | null | undefined): number {
  const minimal = minimalDaysInFirstWeek(locale, firstDayOfWeek);
  // Week 1 of a year is the week holding January `minimal`.
  const firstWeekStart = (year: number) => startOfWeek(new Date(year, 0, minimal), firstDayOfWeek);
  const weekStart = startOfWeek(date, firstDayOfWeek);
  let first = firstWeekStart(weekStart.getFullYear());
  if (weekStart < first) {
    first = firstWeekStart(weekStart.getFullYear() - 1);
  } else {
    // Late December can already belong to next year's week 1.
    const next = firstWeekStart(weekStart.getFullYear() + 1);
    if (weekStart >= next) first = next;
  }
  return Math.round(daysBetween(first, weekStart) / 7) + 1;
}

/** The weeks shown for `month`, each numbered by its first in-month day. */
export function monthWeeks(month: Date, firstDayOfWeek: FirstDayOfWeek, locale: string | null | undefined): CalendarWeek[] {
  const start = startOfWeek(monthOf(month), firstDayOfWeek);
  const end = endOfWeek(new Date(month.getFullYear(), month.getMonth() + 1, 0), firstDayOfWeek);
  const count = (daysBetween(start, end) + 1) / 7;
  return Array.from({ length: count }, (_, w) => {
    const days = Array.from({ length: 7 }, (_, i): CalendarDay => {
      const date = addDays(start, w * 7 + i);
      return { date, dayOfMonth: date.getDate(), isInMonth: isSameYearMonth(date, month) };
    });
    const ref = days.find((d) => d.isInMonth) ?? days[0];
    return { number: weekOfYear(ref.date, firstDayOfWeek, locale), days };
  });
}

/** Weekday names in grid order. */
export function weekdayNames(firstDayOfWeek: FirstDayOfWeek, locale: string | null | undefined): { short: string; long: string }[] {
  const sunday = new Date(2024, 0, 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = addDays(sunday, (firstDayOfWeek + i) % 7);
    return {
      short: d.toLocaleString(locale ?? 'default', { weekday: 'short' }),
      long: d.toLocaleString(locale ?? 'default', { weekday: 'long' }),
    };
  });
}

export function monthLabel(month: Date, locale: string | null | undefined): string {
  const m = month.toLocaleString(locale ?? 'default', { month: 'long' });
  return `${m.charAt(0).toUpperCase()}${m.slice(1)} ${month.getFullYear()}`;
}

export interface DateLimits {
  readonly min: Date | null;
  readonly max: Date | null;
  readonly disableDateFn: ((date: Date) => boolean) | null;
}

/** Out of [min, max] (date only), or rejected by `disableDateFn`. */
export function isDateDisabled(date: Date, { min, max, disableDateFn }: DateLimits): boolean {
  if (min && dateOnly(date) < dateOnly(min)) return true;
  if (max && dateOnly(date) > dateOnly(max)) return true;
  return !!disableDateFn && disableDateFn(date);
}

/**
 * The cell that carries `tabindex="0"`: the focused day, else the selected
 * one, else today, else the first enabled day, each only when in the month.
 */
export function rovingDate(month: Date, weeks: readonly CalendarWeek[], focused: Date | null, selected: Date | null, today: Date, limits: DateLimits): Date | null {
  const inMonth = [focused, selected, today].find((d): d is Date => !!d && isSameYearMonth(d, month));
  if (inMonth) return inMonth;
  return weeks.flatMap((w) => w.days).find((d) => d.isInMonth && !isDateDisabled(d.date, limits))?.date ?? null;
}

/**
 * The APG date-grid keymap: arrows a day or a week (mirrored in RTL),
 * Home/End the week's edges, PageUp/Down a month, with Ctrl a year.
 * Returns the day to move to, or null for a key the grid does not handle.
 */
export function calendarKeyTarget(key: string, from: Date, options: { firstDayOfWeek: FirstDayOfWeek; rtl: boolean; ctrlKey: boolean }): Date | null {
  const { firstDayOfWeek, rtl, ctrlKey } = options;
  const shiftMonths = (n: number) => {
    const target = new Date(from.getFullYear(), from.getMonth() + n, 1);
    // Clamp the day: 31 January plus a month is the last of February.
    const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
    return new Date(target.getFullYear(), target.getMonth(), Math.min(from.getDate(), last));
  };
  switch (key) {
    case 'ArrowLeft':
      return addDays(from, rtl ? 1 : -1);
    case 'ArrowRight':
      return addDays(from, rtl ? -1 : 1);
    case 'ArrowUp':
      return addDays(from, -7);
    case 'ArrowDown':
      return addDays(from, 7);
    case 'Home':
      return startOfWeek(from, firstDayOfWeek);
    case 'End':
      return endOfWeek(from, firstDayOfWeek);
    case 'PageUp':
      return shiftMonths(ctrlKey ? -12 : -1);
    case 'PageDown':
      return shiftMonths(ctrlKey ? 12 : 1);
    default:
      return null;
  }
}

export interface CalendarOptions extends DateLimits {
  readonly id: string;
  readonly month: Date;
  readonly selected: Date | null;
  readonly focused: Date | null;
  readonly today: Date;
  readonly firstDayOfWeek: FirstDayOfWeek;
  readonly locale: string | null;
  /** False on the server and before hydration: the grid is then inert. */
  readonly hydrated: boolean;
  /** Localised accessible names. */
  readonly labels?: Partial<CalendarLabels>;
}

export interface CalendarLabels {
  previousMonth: string;
  nextMonth: string;
  week: string;
}

export const DEFAULT_CALENDAR_LABELS: CalendarLabels = {
  previousMonth: 'Previous month',
  nextMonth: 'Next month',
  week: 'Week',
};

export interface CalendarCellView {
  key: string;
  cell: CalendarBag;
  /** The day number's span; null outside the month, which renders an empty cell. */
  content: CalendarBag | null;
  text: string;
}

export interface CalendarWeekView {
  key: string;
  row: CalendarBag;
  header: CalendarBag;
  number: string;
  cells: CalendarCellView[];
}

export interface CalendarView {
  root: CalendarBag;
  nav: CalendarBag;
  previous: CalendarBag;
  monthLabel: CalendarBag;
  monthText: string;
  next: CalendarBag;
  grid: CalendarBag;
  headRow: CalendarBag;
  weekHeader: CalendarBag;
  weekHeaderText: CalendarBag;
  weekLabel: string;
  weekdays: { key: string; bag: CalendarBag; text: string }[];
  weeks: CalendarWeekView[];
}

const scoped = (bag: CalendarBag): CalendarBag => ({ ...bag, 'data-mps': CALENDAR_SCOPE });
const classes = (...names: (string | false | null)[]) => names.filter(Boolean).join(' ');

/** The cell id of `date`: unique per calendar, so focus can find it after a re-render. */
export const calendarCellId = (id: string, date: Date) => `${id}-day-${isoDate(date)}`;

export function connectCalendar(options: CalendarOptions): CalendarView {
  const { id, month, hydrated } = options;
  const labels = { ...DEFAULT_CALENDAR_LABELS, ...options.labels };
  const labelId = `${id}-month`;
  const weeks = monthWeeks(month, options.firstDayOfWeek, options.locale);
  const roving = rovingDate(month, weeks, options.focused, options.selected, options.today, options);

  const nav = (action: 'previous' | 'next', label: string): CalendarBag =>
    scoped({
      type: 'button',
      class: `calendar-chevron calendar-chevron-${action}`,
      'aria-label': label,
      'data-calendar-action': action,
      // Inert until hydrated: a month button with no script behind it would offer a dead action.
      disabled: !hydrated,
    });

  return {
    root: scoped({ class: 'mp-calendar' }),
    nav: scoped({ class: 'calendar-nav' }),
    previous: nav('previous', labels.previousMonth),
    monthLabel: scoped({ id: labelId, class: 'calendar-month-label', 'aria-live': 'polite' }),
    monthText: monthLabel(month, options.locale),
    next: nav('next', labels.nextMonth),
    grid: scoped({ class: 'calendar-grid', role: 'grid', 'aria-labelledby': labelId }),
    headRow: scoped({ role: 'row' }),
    weekHeader: scoped({ scope: 'col', role: 'columnheader', class: 'calendar-week-header' }),
    weekHeaderText: scoped({ class: 'visually-hidden' }),
    weekLabel: labels.week,
    weekdays: weekdayNames(options.firstDayOfWeek, options.locale).map((d, i) => ({
      key: String(i),
      bag: scoped({ scope: 'col', role: 'columnheader', title: d.long }),
      text: d.short,
    })),
    weeks: weeks.map((week) => ({
      key: isoDate(week.days[0].date),
      row: scoped({ role: 'row' }),
      header: scoped({ scope: 'row', role: 'rowheader', class: 'calendar-week-number' }),
      number: String(week.number),
      cells: week.days.map((day): CalendarCellView => {
        const key = isoDate(day.date);
        if (!day.isInMonth) {
          return { key, cell: scoped({ role: 'gridcell', class: 'calendar-day calendar-day-outside' }), content: null, text: '' };
        }
        const disabled = isDateDisabled(day.date, options);
        const selected = isSameDate(options.selected, day.date);
        return {
          key,
          cell: scoped({
            role: 'gridcell',
            id: calendarCellId(id, day.date),
            class: classes('calendar-day', selected && 'calendar-day-selected', disabled && 'calendar-day-disabled'),
            tabindex: hydrated ? (isSameDate(roving, day.date) ? 0 : -1) : null,
            'aria-selected': selected ? 'true' : 'false',
            'aria-current': isSameDate(options.today, day.date) ? 'date' : null,
            'aria-disabled': disabled ? 'true' : null,
            'data-date': key,
          }),
          content: scoped({ class: 'calendar-day-number' }),
          text: String(day.dayOfMonth),
        };
      }),
    })),
  };
}
