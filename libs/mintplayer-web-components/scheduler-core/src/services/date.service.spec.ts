import { describe, it, expect, beforeEach } from 'vitest';
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

  describe('formatTime', () => {
    it('should format correctly in 24h mode', () => {
      const date = new Date(2025, 0, 15, 14, 30);
      const formatted = service.formatTime(date, '24h');

      expect(formatted).toBe('14:30');
    });

    it('should format correctly in 12h mode', () => {
      const date = new Date(2025, 0, 15, 14, 30);
      const formatted = service.formatTime(date, '12h');

      expect(formatted).toBe('2:30 PM');
    });

    it('should handle midnight in 12h mode', () => {
      const date = new Date(2025, 0, 15, 0, 0);
      const formatted = service.formatTime(date, '12h');

      expect(formatted).toBe('12:00 AM');
    });

    it('should handle noon in 12h mode', () => {
      const date = new Date(2025, 0, 15, 12, 0);
      const formatted = service.formatTime(date, '12h');

      expect(formatted).toBe('12:00 PM');
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

  describe('getWeekNumber', () => {
    it('should return correct week number', () => {
      const date = new Date(2025, 0, 15);
      const weekNum = service.getWeekNumber(date);

      expect(weekNum).toBeGreaterThanOrEqual(1);
      expect(weekNum).toBeLessThanOrEqual(53);
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
