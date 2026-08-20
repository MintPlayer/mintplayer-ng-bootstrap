import { describe, expect, it } from 'vitest';

import { dateService } from './date.service';

/**
 * The half of `DateService` the existing `date.service.spec.ts` does not reach:
 * the grid builders, the slot rounding a drag snaps through, and the localized
 * formatting.
 *
 * The formatting cases assert **structure and localization**, never a literal
 * English string. `Intl` output differs across ICU versions and platforms, so a
 * test pinning "Mon, Jul 27" fails on a different Node build without anything
 * being wrong — while still not proving the locale was honoured. Asserting that
 * two locales differ, and that a range elides what its ends share, tests what
 * the code is actually responsible for.
 */

const JAN_15 = new Date(2026, 0, 15, 10, 30, 0);

describe('getMonthDays', () => {
  it('returns every day of the month and no more', () => {
    expect(dateService.getMonthDays(JAN_15)).toHaveLength(31);
  });

  it('starts on the first and ends on the last', () => {
    const days = dateService.getMonthDays(JAN_15);
    expect(days[0].getDate()).toBe(1);
    expect(days.at(-1)!.getDate()).toBe(31);
  });

  it('stays inside the month', () => {
    expect(dateService.getMonthDays(JAN_15).every((d) => d.getMonth() === 0)).toBe(true);
  });

  it('handles a short month', () => {
    expect(dateService.getMonthDays(new Date(2026, 3, 10))).toHaveLength(30);
  });

  it('handles February in a leap year', () => {
    expect(dateService.getMonthDays(new Date(2024, 1, 10))).toHaveLength(29);
    expect(dateService.getMonthDays(new Date(2026, 1, 10))).toHaveLength(28);
  });

  // A month grid built by adding a day at a time crosses a DST boundary twice a
  // year; a naive +24h loop skips or repeats a date there.
  it('crosses a DST boundary without skipping or repeating a date', () => {
    const march = dateService.getMonthDays(new Date(2026, 2, 10));
    expect(march.map((d) => d.getDate())).toEqual(
      Array.from({ length: 31 }, (_unused, i) => i + 1),
    );
  });
});

describe('getYearStart and getYearMonths', () => {
  it('starts the year at midnight on 1 January', () => {
    const start = dateService.getYearStart(JAN_15);
    expect(start.getMonth()).toBe(0);
    expect(start.getDate()).toBe(1);
    expect(start.getHours()).toBe(0);
  });

  it('lists twelve months', () => {
    expect(dateService.getYearMonths(JAN_15)).toHaveLength(12);
  });

  it('lists them in order, each on the first', () => {
    const months = dateService.getYearMonths(JAN_15);
    expect(months.map((m) => m.getMonth())).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(months.every((m) => m.getDate() === 1)).toBe(true);
  });

  it('stays in the year it was given', () => {
    expect(dateService.getYearMonths(JAN_15).every((m) => m.getFullYear() === 2026)).toBe(true);
  });
});

describe('getWeekGrid', () => {
  it('has one column per day', () => {
    expect(dateService.getWeekGrid(JAN_15).columns).toHaveLength(7);
  });

  it('has one row per time slot', () => {
    const grid = dateService.getWeekGrid(JAN_15, 1, 3600);
    expect(grid.rows).toHaveLength(24);
  });

  it('gives every row a cell per column', () => {
    const grid = dateService.getWeekGrid(JAN_15, 1, 3600);
    expect(grid.rows.every((row) => row.slots.length === 7)).toBe(true);
  });

  it('flattens every cell into allSlots', () => {
    const grid = dateService.getWeekGrid(JAN_15, 1, 3600);
    expect(grid.allSlots).toHaveLength(24 * 7);
  });

  // The row label is the shared time down the gutter, so it must come from the
  // slot rather than from any one day's cell.
  it('labels each row with its time', () => {
    const grid = dateService.getWeekGrid(JAN_15, 1, 3600);
    expect(grid.rows[0].label).toBe(dateService.formatTime(grid.rows[0].time, '24h'));
    expect(grid.rows[9].time.getHours()).toBe(9);
  });

  it('puts each cell on its own column day at the row time', () => {
    const grid = dateService.getWeekGrid(JAN_15, 1, 3600);
    const cell = grid.rows[9].slots[2];
    expect(cell.start.getDate()).toBe(grid.columns[2].getDate());
    expect(cell.start.getHours()).toBe(9);
  });

  it('honours a restricted day window', () => {
    const grid = dateService.getWeekGrid(JAN_15, 1, 3600, '08:00:00', '18:00:00');
    expect(grid.rows).toHaveLength(10);
    expect(grid.rows[0].time.getHours()).toBe(8);
  });

  it('follows the requested week start', () => {
    expect(dateService.getWeekGrid(JAN_15, 0).columns[0].getDay()).toBe(0);
    expect(dateService.getWeekGrid(JAN_15, 1).columns[0].getDay()).toBe(1);
  });
});

describe('slot rounding — where a drag lands', () => {
  const HALF_HOUR = 1800;
  const at = (h: number, m: number) => new Date(2026, 0, 15, h, m, 0, 0);

  it('floors to the slot the time falls in', () => {
    expect(dateService.floorToSlot(at(10, 20), HALF_HOUR).getMinutes()).toBe(0);
    expect(dateService.floorToSlot(at(10, 40), HALF_HOUR).getMinutes()).toBe(30);
  });

  it('ceils to the next slot boundary', () => {
    expect(dateService.ceilToSlot(at(10, 20), HALF_HOUR).getMinutes()).toBe(30);
    expect(dateService.ceilToSlot(at(10, 40), HALF_HOUR).getHours()).toBe(11);
  });

  it('rounds to whichever boundary is nearer', () => {
    expect(dateService.roundToSlot(at(10, 14), HALF_HOUR).getMinutes()).toBe(0);
    expect(dateService.roundToSlot(at(10, 16), HALF_HOUR).getMinutes()).toBe(30);
  });

  // A time already on a boundary must come back unchanged from all three, or a
  // drag that never moved would still shift the event.
  it('leaves a time already on a boundary alone', () => {
    const onBoundary = at(10, 30);
    expect(dateService.floorToSlot(onBoundary, HALF_HOUR).getTime()).toBe(onBoundary.getTime());
    expect(dateService.ceilToSlot(onBoundary, HALF_HOUR).getTime()).toBe(onBoundary.getTime());
    expect(dateService.roundToSlot(onBoundary, HALF_HOUR).getTime()).toBe(onBoundary.getTime());
  });

  it('drops seconds and milliseconds', () => {
    const messy = new Date(2026, 0, 15, 10, 5, 37, 421);
    const floored = dateService.floorToSlot(messy, HALF_HOUR);
    expect(floored.getSeconds()).toBe(0);
    expect(floored.getMilliseconds()).toBe(0);
  });

  it('never returns a floor after a ceil', () => {
    const messy = at(10, 17);
    expect(dateService.floorToSlot(messy, HALF_HOUR).getTime()).toBeLessThanOrEqual(
      dateService.ceilToSlot(messy, HALF_HOUR).getTime(),
    );
  });

  it('works at a finer slot size', () => {
    expect(dateService.floorToSlot(at(10, 7), 300).getMinutes()).toBe(5);
  });

  it('does not mutate the date it was given', () => {
    const original = at(10, 17);
    const before = original.getTime();
    dateService.roundToSlot(original, HALF_HOUR);
    expect(original.getTime()).toBe(before);
  });
});

describe('detectTimeFormat', () => {
  it('reads 12-hour from a locale that uses it', () => {
    expect(dateService.detectTimeFormat('en-US')).toBe('12h');
  });

  it('reads 24-hour from a locale that uses it', () => {
    expect(dateService.detectTimeFormat('nl-BE')).toBe('24h');
  });

  // A malformed tag throws inside Intl, and a scheduler that cannot render its
  // gutter because a consumer typo'd a locale is worse than one showing 24-hour
  // time.
  it('falls back to 24-hour rather than throwing on a bad locale', () => {
    expect(dateService.detectTimeFormat('not a locale')).toBe('24h');
  });
});

describe('localized formatting', () => {
  it('formats a date for the locale', () => {
    expect(dateService.formatDate(JAN_15, 'en-US')).not.toBe(
      dateService.formatDate(JAN_15, 'ja-JP'),
    );
  });

  it('passes formatting options through', () => {
    expect(dateService.formatDate(JAN_15, 'en-US', { year: 'numeric' })).toBe('2026');
  });

  it('includes the weekday, the month and the day', () => {
    const formatted = dateService.formatDateWithWeekday(JAN_15, 'en-US');
    expect(formatted).toContain('15');
    expect(formatted).toMatch(/[A-Za-z]/);
  });

  // Field ORDER is the locale's business, not ours — the point of going through
  // Intl rather than assembling the string by hand.
  it('lets the locale order the fields', () => {
    expect(dateService.formatDateWithWeekday(JAN_15, 'en-US')).not.toBe(
      dateService.formatDateWithWeekday(JAN_15, 'ja-JP'),
    );
  });

  it('names the month long and short', () => {
    const long = dateService.getMonthName(JAN_15, 'en-US', 'long');
    const short = dateService.getMonthName(JAN_15, 'en-US', 'short');
    expect(long.length).toBeGreaterThanOrEqual(short.length);
    expect(long).toContain(short.replace('.', ''));
  });

  it('names the day at three widths', () => {
    const narrow = dateService.getDayName(JAN_15, 'en-US', 'narrow');
    const short = dateService.getDayName(JAN_15, 'en-US', 'short');
    const long = dateService.getDayName(JAN_15, 'en-US', 'long');
    expect(narrow.length).toBeLessThanOrEqual(short.length);
    expect(short.length).toBeLessThanOrEqual(long.length);
  });

  it('localizes the month name', () => {
    expect(dateService.getMonthName(JAN_15, 'en-US')).not.toBe(
      dateService.getMonthName(JAN_15, 'nl-BE'),
    );
  });
});

describe('ranges', () => {
  const start = new Date(2026, 6, 27, 9, 0);
  const end = new Date(2026, 7, 2, 10, 0);

  it('names both ends of a date range', () => {
    const range = dateService.formatDateRange(start, end, 'en-US', {
      month: 'short',
      day: 'numeric',
    });
    expect(range).toContain('27');
    expect(range).toContain('2');
  });

  /*
   * The point of going through `formatRange` rather than joining two formatted
   * dates: the locale elides what the ends share, so a range inside one month
   * names that month once. A hand-joined string repeats it, and repeats the
   * year too.
   */
  it('elides the parts the two ends share', () => {
    const sameMonth = dateService.formatDateRange(
      new Date(2026, 6, 5),
      new Date(2026, 6, 9),
      'en-US',
      { month: 'long', day: 'numeric' },
    );
    expect(sameMonth.match(/July/g) ?? []).toHaveLength(1);
  });

  it('formats a time range', () => {
    const range = dateService.formatTimeRange(new Date(2026, 0, 15, 9, 0), new Date(2026, 0, 15, 10, 0), '24h');
    expect(range).toContain('09');
    expect(range).toContain('10');
  });

  // The reason the helper exists at all: the event chips used a hyphen and the
  // announcements an en-dash, so neither now hardcodes a separator.
  it('lets the locale choose the separator rather than hardcoding one', () => {
    const range = dateService.formatTimeRange(
      new Date(2026, 0, 15, 9, 0),
      new Date(2026, 0, 15, 10, 0),
      '24h',
      'en-US',
    );
    expect(range).not.toContain(' - ');
  });

  it('honours the requested clock', () => {
    const noon = new Date(2026, 0, 15, 13, 0);
    const later = new Date(2026, 0, 15, 14, 0);
    expect(dateService.formatTimeRange(noon, later, '24h', 'en-US')).toContain('13');
    expect(dateService.formatTimeRange(noon, later, '12h', 'en-US')).toContain('1');
  });
});

describe('comparisons and arithmetic', () => {
  it('recognises a past date', () => {
    expect(dateService.isPast(new Date(2000, 0, 1))).toBe(true);
    expect(dateService.isPast(new Date(Date.now() + 60_000))).toBe(false);
  });

  it('accepts a date inside a range, edges included', () => {
    const start = new Date(2026, 0, 10);
    const end = new Date(2026, 0, 20);
    expect(dateService.isInRange(new Date(2026, 0, 15), start, end)).toBe(true);
    expect(dateService.isInRange(start, start, end)).toBe(true);
    expect(dateService.isInRange(end, start, end)).toBe(true);
  });

  it('rejects a date outside the range', () => {
    const start = new Date(2026, 0, 10);
    const end = new Date(2026, 0, 20);
    expect(dateService.isInRange(new Date(2026, 0, 9), start, end)).toBe(false);
    expect(dateService.isInRange(new Date(2026, 0, 21), start, end)).toBe(false);
  });

  it('adds and subtracts years', () => {
    expect(dateService.addYears(JAN_15, 2).getFullYear()).toBe(2028);
    expect(dateService.addYears(JAN_15, -1).getFullYear()).toBe(2025);
  });

  it('does not mutate the date it adds to', () => {
    const original = new Date(JAN_15);
    dateService.addYears(original, 5);
    expect(original.getTime()).toBe(JAN_15.getTime());
  });

  it('counts seconds since midnight', () => {
    expect(dateService.getSecondsFromMidnight(new Date(2026, 0, 15, 1, 1, 1))).toBe(3661);
    expect(dateService.getSecondsFromMidnight(new Date(2026, 0, 15, 0, 0, 0))).toBe(0);
  });

  it('measures a duration in seconds', () => {
    expect(
      dateService.getDurationInSeconds(new Date(2026, 0, 15, 9, 0), new Date(2026, 0, 15, 10, 30)),
    ).toBe(5400);
  });

  it('reports a zero-length duration as zero', () => {
    const moment = new Date(2026, 0, 15, 9, 0);
    expect(dateService.getDurationInSeconds(moment, moment)).toBe(0);
  });
});
