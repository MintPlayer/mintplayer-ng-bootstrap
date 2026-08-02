import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DateService, dateService } from './date.service';

describe('DateService', () => {
  let service: DateService;

  beforeEach(() => {
    service = new DateService();
  });

  describe('getWeekStart', () => {
    it('should return Monday for firstDayOfWeek=1', () => {
      // Wednesday, January 15, 2025
      const date = new Date(2025, 0, 15);
      const weekStart = service.getWeekStart(date, 1);

      expect(weekStart.getDay()).toBe(1); // Monday
      expect(weekStart.getDate()).toBe(13);
    });

    it('should return Sunday for firstDayOfWeek=0', () => {
      // Wednesday, January 15, 2025
      const date = new Date(2025, 0, 15);
      const weekStart = service.getWeekStart(date, 0);

      expect(weekStart.getDay()).toBe(0); // Sunday
      expect(weekStart.getDate()).toBe(12);
    });

    it('should handle month boundary correctly', () => {
      // Tuesday, January 1, 2025
      const date = new Date(2025, 0, 1);
      const weekStart = service.getWeekStart(date, 1);

      expect(weekStart.getMonth()).toBe(11); // December
      expect(weekStart.getFullYear()).toBe(2024);
      expect(weekStart.getDate()).toBe(30);
    });

    it('should return same day if it is the first day of week', () => {
      // Monday, January 13, 2025
      const date = new Date(2025, 0, 13);
      const weekStart = service.getWeekStart(date, 1);

      expect(weekStart.getDate()).toBe(13);
    });
  });

  describe('getWeekDays', () => {
    it('should return 7 days starting from week start', () => {
      const date = new Date(2025, 0, 15);
      const days = service.getWeekDays(date, 1);

      expect(days.length).toBe(7);
      expect(days[0].getDay()).toBe(1); // Monday
      expect(days[6].getDay()).toBe(0); // Sunday
    });

    it('should handle year boundary correctly', () => {
      // December 31, 2024
      const date = new Date(2024, 11, 31);
      const days = service.getWeekDays(date, 1);

      expect(days.length).toBe(7);
      // Week should span Dec 30, 2024 to Jan 5, 2025
      expect(days[0].getFullYear()).toBe(2024);
      expect(days[6].getFullYear()).toBe(2025);
    });
  });

  describe('getMonthStart', () => {
    it('should return first day of month', () => {
      const date = new Date(2025, 5, 15);
      const monthStart = service.getMonthStart(date);

      expect(monthStart.getDate()).toBe(1);
      expect(monthStart.getMonth()).toBe(5);
      expect(monthStart.getHours()).toBe(0);
    });
  });

  describe('getMonthEnd', () => {
    it('should return last day of month', () => {
      const date = new Date(2025, 0, 15); // January
      const monthEnd = service.getMonthEnd(date);

      expect(monthEnd.getDate()).toBe(31);
      expect(monthEnd.getMonth()).toBe(0);
    });

    it('should handle February correctly', () => {
      const date = new Date(2025, 1, 15); // February 2025 (non-leap year)
      const monthEnd = service.getMonthEnd(date);

      expect(monthEnd.getDate()).toBe(28);
    });

    it('should handle leap year February', () => {
      const date = new Date(2024, 1, 15); // February 2024 (leap year)
      const monthEnd = service.getMonthEnd(date);

      expect(monthEnd.getDate()).toBe(29);
    });
  });

  describe('week start (Sunday vs Monday)', () => {
    // These ran Monday-only until firstDayOfWeek became locale-derived. A grid
    // that silently assumes Monday is exactly what breaks for en-US and ja-JP.
    it('getWeekDays starts on the requested day and spans seven', () => {
      const wednesday = new Date(2026, 6, 29);

      const monday = service.getWeekDays(wednesday, 1);
      expect(monday).toHaveLength(7);
      expect(monday[0].getDay()).toBe(1);
      expect(monday[6].getDay()).toBe(0);

      const sunday = service.getWeekDays(wednesday, 0);
      expect(sunday).toHaveLength(7);
      expect(sunday[0].getDay()).toBe(0);
      expect(sunday[6].getDay()).toBe(6);

      // The two weeks are genuinely different windows, not the same array.
      expect(sunday[0].getTime()).not.toBe(monday[0].getTime());
    });

    it('getMonthWeeks covers every day of the month under either start', () => {
      for (const firstDay of [0, 1] as const) {
        for (let month = 0; month < 12; month++) {
          const weeks = service.getMonthWeeks(new Date(2026, month, 15), firstDay);
          const flat = weeks.flat();

          expect(weeks.every((w) => w.length === 7)).toBe(true);
          expect(flat[0].getDay()).toBe(firstDay);

          const last = service.getMonthEnd(new Date(2026, month, 15)).getDate();
          for (let d = 1; d <= last; d++) {
            const present = flat.some(
              (x) => x.getMonth() === month && x.getDate() === d,
            );
            expect(present, `${2026}-${month + 1}-${d} missing (firstDay ${firstDay})`).toBe(true);
          }
        }
      }
    });

    it('row count follows the week start — the month grid is not fixed height', () => {
      // May 2026 needs 5 rows Monday-first and 6 Sunday-first. Nothing in the
      // CSS assumes a count (grid-auto-rows), but the arithmetic must be honest.
      expect(service.getMonthWeeks(new Date(2026, 4, 15), 1)).toHaveLength(5);
      expect(service.getMonthWeeks(new Date(2026, 4, 15), 0)).toHaveLength(6);
    });
  });

  describe('resolveFirstDayOfWeek', () => {
    it('prefers an explicit value over the locale', () => {
      expect(service.resolveFirstDayOfWeek(3, 'en-US')).toBe(3);
      expect(service.resolveFirstDayOfWeek(0, 'nl-BE')).toBe(0);
    });

    it('derives Sunday for en-US and Monday for nl-BE', () => {
      // getWeekInfo reports Sunday as 7; DayOfWeek and Date.getDay() call it 0.
      // The %7 conversion is the whole point of this function.
      expect(service.resolveFirstDayOfWeek(undefined, 'en-US')).toBe(0);
      expect(service.resolveFirstDayOfWeek(undefined, 'nl-BE')).toBe(1);
    });

    it('never returns 7 — that value is invalid for DayOfWeek', () => {
      for (const locale of ['en-US', 'nl-BE', 'ja-JP', 'fr-BE', 'de-DE', 'ar-EG']) {
        const resolved = service.resolveFirstDayOfWeek(undefined, locale);
        expect(resolved).toBeGreaterThanOrEqual(0);
        expect(resolved).toBeLessThanOrEqual(6);
      }
    });

    it('falls back to Monday when the locale is unusable', () => {
      expect(service.resolveFirstDayOfWeek(undefined, '!!not-a-locale!!')).toBe(1);
    });
  });

  describe('getMonthWeeks', () => {
    it('should return correct number of weeks', () => {
      const date = new Date(2025, 0, 15); // January 2025
      const weeks = service.getMonthWeeks(date, 1);

      expect(weeks.length).toBeGreaterThanOrEqual(4);
      expect(weeks.length).toBeLessThanOrEqual(6);
    });

    it('should include days from adjacent months for complete grid', () => {
      const date = new Date(2025, 0, 15); // January 2025
      const weeks = service.getMonthWeeks(date, 1);

      // First week might include December days
      const firstDay = weeks[0][0];
      const lastDay = weeks[weeks.length - 1][6];

      // Grid should be complete (7 days per week)
      weeks.forEach((week) => {
        expect(week.length).toBe(7);
      });
    });
  });

  describe('getTimeSlots', () => {
    it('should return correct number of slots based on duration', () => {
      const date = new Date(2025, 0, 15);
      // 30 min slots from 00:00 to 24:00 = 48 slots
      const slots = service.getTimeSlots(date, 1800, '00:00:00', '24:00:00');

      expect(slots.length).toBe(48);
    });

    it('should return correct slots for 1 hour duration', () => {
      const date = new Date(2025, 0, 15);
      // 1 hour slots from 00:00 to 24:00 = 24 slots
      const slots = service.getTimeSlots(date, 3600, '00:00:00', '24:00:00');

      expect(slots.length).toBe(24);
    });

    it('should respect minTime and maxTime', () => {
      const date = new Date(2025, 0, 15);
      // 1 hour slots from 09:00 to 17:00 = 8 slots
      const slots = service.getTimeSlots(date, 3600, '09:00:00', '17:00:00');

      expect(slots.length).toBe(8);
      expect(slots[0].start.getHours()).toBe(9);
      expect(slots[7].end.getHours()).toBe(17);
    });
  });

  // Every assertion here pins an explicit locale. formatTime now delegates to
  // Intl, so an unpinned expectation asserts the MACHINE's locale: 'PM' on a US
  // box, 'p.m.' on a Dutch one. That is a test that passes or fails by geography.
  describe('formatTime', () => {
    it('should format correctly in 24h mode', () => {
      const date = new Date(2025, 0, 15, 14, 30);

      expect(service.formatTime(date, '24h', 'en-US')).toBe('14:30');
      expect(service.formatTime(date, '24h', 'nl-BE')).toBe('14:30');
    });

    it('should format correctly in 12h mode', () => {
      const date = new Date(2025, 0, 15, 14, 30);

      expect(service.formatTime(date, '12h', 'en-US')).toBe('2:30 PM');
    });

    it('should handle midnight in 12h mode', () => {
      const date = new Date(2025, 0, 15, 0, 0);

      expect(service.formatTime(date, '12h', 'en-US')).toBe('12:00 AM');
    });

    it('should handle noon in 12h mode', () => {
      const date = new Date(2025, 0, 15, 12, 0);

      expect(service.formatTime(date, '12h', 'en-US')).toBe('12:00 PM');
    });

    it('localizes the meridiem rather than hardcoding AM/PM', () => {
      const date = new Date(2025, 0, 15, 14, 30);

      // The old implementation returned the literal 'PM' for every locale on
      // earth. Dutch writes it with periods; the point is only that it differs.
      expect(service.formatTime(date, '12h', 'nl-BE')).not.toBe(
        service.formatTime(date, '12h', 'en-US'),
      );
      expect(service.formatTime(date, '12h', 'nl-BE')).toContain('2:30');
    });

    it('follows the locale when no format is given', () => {
      const date = new Date(2025, 0, 15, 14, 30);

      // undefined means "let the locale decide" — US clocks are 12-hour,
      // Belgian ones 24-hour. Previously this was pinned to 24h for everyone.
      expect(service.formatTime(date, undefined, 'en-US')).toContain('2:30');
      expect(service.formatTime(date, undefined, 'nl-BE')).toContain('14:30');
    });

    it('reuses one Intl formatter per locale+format pair', () => {
      const date = new Date(2025, 0, 15, 14, 30);
      // Called once per slot per day in a real render — hundreds of times.
      // Constructing a formatter each call is the classic Intl performance trap.
      service.formatTime(date, '24h', 'en-US'); // warm the cache

      // The spy must construct a REAL formatter, or formatTime has nothing to
      // call .format on — vi.spyOn alone replaces the native constructor.
      const RealDateTimeFormat = Intl.DateTimeFormat;
      const spy = vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(
        // A `function`, not an arrow: arrows are not constructible, and
        // formatTime calls this with `new`.
        function (this: unknown, ...args: unknown[]) {
          return new (RealDateTimeFormat as unknown as new (
            ...a: unknown[]
          ) => Intl.DateTimeFormat)(...args);
        } as unknown as typeof Intl.DateTimeFormat,
      );
      try {
        for (let i = 0; i < 50; i++) service.formatTime(date, '24h', 'en-US');
        expect(spy).not.toHaveBeenCalled();

        // A different pair is a different formatter, and is built exactly once.
        service.formatTime(date, '12h', 'en-US');
        service.formatTime(date, '12h', 'en-US');
        expect(spy).toHaveBeenCalledTimes(1);
      } finally {
        spy.mockRestore();
      }
    });
  });

  describe('isSameDay', () => {
    it('should return true for same day', () => {
      const date1 = new Date(2025, 0, 15, 10, 0);
      const date2 = new Date(2025, 0, 15, 20, 0);

      expect(service.isSameDay(date1, date2)).toBe(true);
    });

    it('should return false for different days', () => {
      const date1 = new Date(2025, 0, 15);
      const date2 = new Date(2025, 0, 16);

      expect(service.isSameDay(date1, date2)).toBe(false);
    });
  });

  describe('isSameMonth', () => {
    it('should return true for same month', () => {
      const date1 = new Date(2025, 0, 1);
      const date2 = new Date(2025, 0, 31);

      expect(service.isSameMonth(date1, date2)).toBe(true);
    });

    it('should return false for different months', () => {
      const date1 = new Date(2025, 0, 15);
      const date2 = new Date(2025, 1, 15);

      expect(service.isSameMonth(date1, date2)).toBe(false);
    });
  });

  describe('isToday', () => {
    it('should return true for today', () => {
      const today = new Date();
      expect(service.isToday(today)).toBe(true);
    });

    it('should return false for yesterday', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(service.isToday(yesterday)).toBe(false);
    });
  });

  describe('addDays', () => {
    it('should add days correctly', () => {
      const date = new Date(2025, 0, 15);
      const result = service.addDays(date, 5);

      expect(result.getDate()).toBe(20);
    });

    it('should handle month boundary', () => {
      const date = new Date(2025, 0, 30);
      const result = service.addDays(date, 5);

      expect(result.getMonth()).toBe(1); // February
      expect(result.getDate()).toBe(4);
    });

    it('should handle negative days', () => {
      const date = new Date(2025, 0, 15);
      const result = service.addDays(date, -5);

      expect(result.getDate()).toBe(10);
    });
  });

  describe('addWeeks', () => {
    it('should add weeks correctly', () => {
      const date = new Date(2025, 0, 15);
      const result = service.addWeeks(date, 2);

      expect(result.getDate()).toBe(29);
    });
  });

  describe('addMonths', () => {
    it('should add months correctly', () => {
      const date = new Date(2025, 0, 15);
      const result = service.addMonths(date, 3);

      expect(result.getMonth()).toBe(3); // April
    });

    it('should handle year boundary', () => {
      const date = new Date(2025, 10, 15); // November
      const result = service.addMonths(date, 3);

      expect(result.getFullYear()).toBe(2026);
      expect(result.getMonth()).toBe(1); // February
    });
  });

  describe('getDaysDifference', () => {
    it('should return correct difference', () => {
      const date1 = new Date(2025, 0, 10);
      const date2 = new Date(2025, 0, 15);

      expect(service.getDaysDifference(date1, date2)).toBe(5);
    });

    it('should return negative for reversed dates', () => {
      const date1 = new Date(2025, 0, 15);
      const date2 = new Date(2025, 0, 10);

      expect(service.getDaysDifference(date1, date2)).toBe(-5);
    });
  });

  describe('roundToSlot', () => {
    it('should round to nearest slot', () => {
      const date = new Date(2025, 0, 15, 10, 20); // 10:20
      const rounded = service.roundToSlot(date, 1800); // 30 min slots

      expect(rounded.getMinutes()).toBe(30);
    });

    it('should round down when closer to previous slot', () => {
      const date = new Date(2025, 0, 15, 10, 10); // 10:10
      const rounded = service.roundToSlot(date, 1800); // 30 min slots

      expect(rounded.getMinutes()).toBe(0);
    });
  });

  describe('singleton instance', () => {
    it('should export a singleton instance', () => {
      expect(dateService).toBeInstanceOf(DateService);
    });
  });
});
