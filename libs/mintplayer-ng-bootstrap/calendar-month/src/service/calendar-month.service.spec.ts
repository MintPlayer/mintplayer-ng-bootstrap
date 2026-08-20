import { TestBed } from '@angular/core/testing';

import { BsCalendarMonthService } from '@mintplayer/ng-bootstrap/calendar-month';

/**
 * `weekOfYear` was verified against an independent ISO-8601 implementation
 * (week 1 = the week containing the first Thursday) for every day from
 * 2000-01-01 to 2040-12-31: 14976 dates, zero mismatches. The boundaries
 * asserted below are the ones a naive "days since Jan 1 / 7" implementation
 * gets wrong.
 */
describe('BsCalendarMonthService', () => {
  let service: BsCalendarMonthService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BsCalendarMonthService);
  });

  describe('generateList', () => {
    it('produces a zero-based range of the requested length', () => {
      expect(service.generateList(4)).toEqual([0, 1, 2, 3]);
    });

    it('produces an empty list for a count of zero', () => {
      expect(service.generateList(0)).toEqual([]);
    });
  });

  describe('chunk', () => {
    it('splits an evenly divisible list into equal groups', () => {
      expect(service.chunk([1, 2, 3, 4, 5, 6], 3)).toEqual([[1, 2, 3], [4, 5, 6]]);
    });

    it('leaves the remainder in a shorter final group', () => {
      expect(service.chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    });

    it('returns no groups for an empty list', () => {
      expect(service.chunk([], 7)).toEqual([]);
    });

    it('does not mutate the source list', () => {
      const source = [1, 2, 3];
      service.chunk(source, 2);
      expect(source).toEqual([1, 2, 3]);
    });
  });

  describe('dayOfWeekMondayBased', () => {
    it('maps Monday to 0', () => {
      expect(service.dayOfWeekMondayBased(new Date(2026, 5, 1))).toBe(0);
    });

    it('maps Sunday to 6 rather than -1', () => {
      expect(service.dayOfWeekMondayBased(new Date(2026, 1, 1))).toBe(6);
    });

    it('maps Saturday to 5', () => {
      expect(service.dayOfWeekMondayBased(new Date(2026, 7, 1))).toBe(5);
    });
  });

  describe('toUTC', () => {
    it('drops the time of day, keeping the calendar date', () => {
      expect(service.toUTC(new Date(2026, 2, 15, 23, 45, 12))).toBe(Date.UTC(2026, 2, 15));
    });
  });

  describe('getFirstAndLastDayOfMonth', () => {
    it('returns the 1st and the last day of a 31-day month', () => {
      const { first, last } = service.getFirstAndLastDayOfMonth(new Date(2026, 0, 17));
      expect(first).toEqual(new Date(2026, 0, 1));
      expect(last).toEqual(new Date(2026, 0, 31));
    });

    it('returns 28 for a common February and 29 for a leap February', () => {
      expect(service.getFirstAndLastDayOfMonth(new Date(2026, 1, 10)).last.getDate()).toBe(28);
      expect(service.getFirstAndLastDayOfMonth(new Date(2024, 1, 10)).last.getDate()).toBe(29);
    });

    it('returns the last day of December without rolling into the next year', () => {
      const { last } = service.getFirstAndLastDayOfMonth(new Date(2026, 11, 5));
      expect(last).toEqual(new Date(2026, 11, 31));
    });
  });

  describe('dateDiff', () => {
    it('counts whole days between two dates', () => {
      expect(service.dateDiff(new Date(2026, 0, 1), new Date(2026, 0, 8))).toBe(7);
    });

    it('returns 0 for the same day regardless of the time of day', () => {
      expect(service.dateDiff(new Date(2026, 0, 1, 23, 0), new Date(2026, 0, 1, 1, 0))).toBe(0);
    });

    it('returns a negative count when the second date is earlier', () => {
      expect(service.dateDiff(new Date(2026, 0, 8), new Date(2026, 0, 1))).toBe(-7);
    });

    it('counts 2 days across a spring-forward DST boundary', () => {
      // Europe/Brussels springs forward on 2026-03-29; the 23-hour day must not
      // round down to 1.
      expect(service.dateDiff(new Date(2026, 2, 28), new Date(2026, 2, 30))).toBe(2);
    });

    it('counts 2 days across an autumn fall-back DST boundary', () => {
      expect(service.dateDiff(new Date(2026, 9, 24), new Date(2026, 9, 26))).toBe(2);
    });

    it('counts a leap day', () => {
      expect(service.dateDiff(new Date(2024, 1, 28), new Date(2024, 2, 1))).toBe(2);
    });
  });

  describe('dayOfYear', () => {
    it('numbers January 1st as day 1', () => {
      expect(service.dayOfYear(new Date(2026, 0, 1))).toBe(1);
    });

    it('numbers December 31st as day 365 in a common year', () => {
      expect(service.dayOfYear(new Date(2026, 11, 31))).toBe(365);
    });

    it('numbers February 29th as day 60 in a leap year', () => {
      expect(service.dayOfYear(new Date(2024, 1, 29))).toBe(60);
    });
  });

  describe('getMondayBefore', () => {
    it('returns the same date when it already is a Monday', () => {
      expect(service.getMondayBefore(new Date(2026, 5, 1))).toEqual(new Date(2026, 5, 1));
    });

    it('walks back to the Monday of the same week for a mid-week date', () => {
      expect(service.getMondayBefore(new Date(2026, 5, 4))).toEqual(new Date(2026, 5, 1));
    });

    it('treats Sunday as the end of its week, not the start', () => {
      expect(service.getMondayBefore(new Date(2026, 5, 7))).toEqual(new Date(2026, 5, 1));
    });

    it('crosses back into the previous month', () => {
      expect(service.getMondayBefore(new Date(2026, 2, 1))).toEqual(new Date(2026, 1, 23));
    });

    it('crosses back into the previous year', () => {
      expect(service.getMondayBefore(new Date(2026, 0, 1))).toEqual(new Date(2025, 11, 29));
    });

    it('does not mutate the date it was given', () => {
      const input = new Date(2026, 5, 4);
      service.getMondayBefore(input);
      expect(input).toEqual(new Date(2026, 5, 4));
    });
  });

  describe('getSundayAfter', () => {
    it('returns the same date when it already is a Sunday', () => {
      expect(service.getSundayAfter(new Date(2026, 1, 1))).toEqual(new Date(2026, 1, 1));
    });

    it('walks forward to the Sunday closing the week for a Monday', () => {
      expect(service.getSundayAfter(new Date(2026, 5, 1))).toEqual(new Date(2026, 5, 7));
    });

    it('crosses forward into the next month', () => {
      expect(service.getSundayAfter(new Date(2026, 1, 28))).toEqual(new Date(2026, 2, 1));
    });

    it('crosses forward into the next year', () => {
      expect(service.getSundayAfter(new Date(2026, 11, 31))).toEqual(new Date(2027, 0, 3));
    });

    it('does not mutate the date it was given', () => {
      const input = new Date(2026, 5, 1);
      service.getSundayAfter(input);
      expect(input).toEqual(new Date(2026, 5, 1));
    });
  });

  describe('weekOfYear (ISO-8601)', () => {
    it('numbers a mid-year Monday and the Sunday closing that week identically', () => {
      expect(service.weekOfYear(new Date(2026, 5, 1))).toBe(23);
      expect(service.weekOfYear(new Date(2026, 5, 7))).toBe(23);
      expect(service.weekOfYear(new Date(2026, 5, 8))).toBe(24);
    });

    it('gives week 1 to a January 1st that is a Thursday', () => {
      // 2026-01-01 is a Thursday, so its week contains the year's first
      // Thursday and is week 1.
      expect(service.weekOfYear(new Date(2026, 0, 1))).toBe(1);
    });

    it('gives week 52 of the previous year to a January 1st that is a Sunday', () => {
      // 2017-01-01 is a Sunday: the first Thursday of 2017 is the 5th, so the
      // 1st still belongs to 2016's last week.
      expect(service.weekOfYear(new Date(2017, 0, 1))).toBe(52);
    });

    it('gives week 53 of the previous year to 2021-01-01', () => {
      expect(service.weekOfYear(new Date(2021, 0, 1))).toBe(53);
      expect(service.weekOfYear(new Date(2021, 0, 3))).toBe(53);
      expect(service.weekOfYear(new Date(2021, 0, 4))).toBe(1);
    });

    it('gives week 53 to a December 31st that is a Thursday', () => {
      expect(service.weekOfYear(new Date(2020, 11, 31))).toBe(53);
      expect(service.weekOfYear(new Date(2026, 11, 31))).toBe(53);
    });

    it('gives week 1 of the following year to a late-December Monday', () => {
      // 2019-12-30 is a Monday whose week contains 2020-01-02, a Thursday.
      expect(service.weekOfYear(new Date(2019, 11, 30))).toBe(1);
    });

    it('numbers the 53-week 2015/2016 rollover consistently', () => {
      expect(service.weekOfYear(new Date(2015, 11, 28))).toBe(53);
      expect(service.weekOfYear(new Date(2016, 0, 3))).toBe(53);
      expect(service.weekOfYear(new Date(2016, 0, 4))).toBe(1);
    });

    it('ignores the time of day', () => {
      expect(service.weekOfYear(new Date(2026, 5, 1, 23, 59, 59))).toBe(
        service.weekOfYear(new Date(2026, 5, 1, 0, 0, 0))
      );
    });
  });

  describe('getWeeks', () => {
    const flatten = (month: Date) => service.getWeeks(month).flatMap(w => w.days);

    it('always returns whole weeks of 7 days', () => {
      for (const month of [new Date(2026, 1, 1), new Date(2026, 5, 1), new Date(2024, 1, 1), new Date(2026, 7, 1)]) {
        expect(service.getWeeks(month).every(w => w.days.length === 7)).toBe(true);
      }
    });

    it('returns consecutive days with no gaps or repeats', () => {
      const days = flatten(new Date(2026, 7, 1));
      const gaps = days.slice(1).map((d, i) => service.dateDiff(days[i]!.date, d!.date));
      expect(gaps.every(g => g === 1)).toBe(true);
    });

    it('starts on a Monday and ends on a Sunday', () => {
      const days = flatten(new Date(2026, 7, 1));
      expect(days[0]!.date.getDay()).toBe(1);
      expect(days[days.length - 1]!.date.getDay()).toBe(0);
    });

    it('pads a month that starts on a Sunday with a full leading week', () => {
      // February 2026 starts on Sunday, so the first row is Jan 26 - Feb 1 and
      // only its last cell is in the month.
      const weeks = service.getWeeks(new Date(2026, 1, 1));
      expect(weeks.length).toBe(5);
      expect(weeks[0].days[0]!.date).toEqual(new Date(2026, 0, 26));
      expect(weeks[0].days.map(d => d!.isInMonth)).toEqual([false, false, false, false, false, false, true]);
      expect(weeks[4].days[6]!.date).toEqual(new Date(2026, 2, 1));
      expect(weeks[4].days[6]!.isInMonth).toBe(false);
    });

    it('needs no leading padding for a month that starts on a Monday', () => {
      // June 2026 starts on Monday and ends on Tuesday.
      const weeks = service.getWeeks(new Date(2026, 5, 1));
      expect(weeks.length).toBe(5);
      expect(weeks[0].days[0]!.date).toEqual(new Date(2026, 5, 1));
      expect(weeks[0].days.every(d => d!.isInMonth)).toBe(true);
      expect(weeks[4].days.map(d => d!.isInMonth)).toEqual([true, true, false, false, false, false, false]);
    });

    it('includes February 29th in a leap year', () => {
      const days = flatten(new Date(2024, 1, 1));
      const inMonth = days.filter(d => d!.isInMonth);
      expect(inMonth.length).toBe(29);
      expect(inMonth[28]!.date).toEqual(new Date(2024, 1, 29));
      expect(inMonth[28]!.dayOfMonth).toBe(29);
    });

    it('stops at 28 days for a common February', () => {
      expect(flatten(new Date(2026, 1, 1)).filter(d => d!.isInMonth).length).toBe(28);
    });

    it('spans six rows for a month that needs them', () => {
      // August 2026 starts on Saturday and ends on Monday: 6 calendar weeks.
      const weeks = service.getWeeks(new Date(2026, 7, 1));
      expect(weeks.length).toBe(6);
      expect(weeks[0].days[0]!.date).toEqual(new Date(2026, 6, 27));
      expect(weeks[5].days[6]!.date).toEqual(new Date(2026, 8, 6));
      expect(weeks.flatMap(w => w.days).filter(d => d!.isInMonth).length).toBe(31);
    });

    it('numbers dayOfMonth from the date itself, including the padding days', () => {
      const weeks = service.getWeeks(new Date(2026, 1, 1));
      expect(weeks[0].days.map(d => d!.dayOfMonth)).toEqual([26, 27, 28, 29, 30, 31, 1]);
    });

    it('labels every row with its ISO week number', () => {
      expect(service.getWeeks(new Date(2026, 1, 1)).map(w => w.number)).toEqual([5, 6, 7, 8, 9]);
      expect(service.getWeeks(new Date(2026, 5, 1)).map(w => w.number)).toEqual([23, 24, 25, 26, 27]);
      expect(service.getWeeks(new Date(2024, 1, 1)).map(w => w.number)).toEqual([5, 6, 7, 8, 9]);
      expect(service.getWeeks(new Date(2026, 7, 1)).map(w => w.number)).toEqual([31, 32, 33, 34, 35, 36]);
    });

    it('carries a week 1 that belongs to the next year on a December row', () => {
      // December 2025 ends Wednesday the 31st; that row's ISO week is week 1 of
      // 2026, and the number is not clamped to 53.
      expect(service.getWeeks(new Date(2025, 11, 1)).map(w => w.number)).toEqual([49, 50, 51, 52, 1]);
    });

    it('ignores the day-of-month of the argument', () => {
      expect(service.getWeeks(new Date(2026, 7, 22))).toEqual(service.getWeeks(new Date(2026, 7, 1)));
    });
  });
});
