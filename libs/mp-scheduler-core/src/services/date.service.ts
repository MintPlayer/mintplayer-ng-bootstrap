import { DayOfWeek, TimeFormat } from '../models/types';
import { TimeSlot, TimeSlotRow, SchedulerGrid } from '../models/time-slot';

/**
 * Service for date calculations and formatting
 */
export class DateService {
  /**
   * Get the start of the week for a given date
   */
  getWeekStart(date: Date, firstDayOfWeek: DayOfWeek = 1): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = (day < firstDayOfWeek ? 7 : 0) + day - firstDayOfWeek;
    d.setDate(d.getDate() - diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  /**
   * Get all days in a week starting from a given date
   */
  getWeekDays(date: Date, firstDayOfWeek: DayOfWeek = 1): Date[] {
    const weekStart = this.getWeekStart(date, firstDayOfWeek);
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + i);
      days.push(day);
    }
    return days;
  }

  /**
   * Get the start of the month for a given date
   */
  getMonthStart(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
  }

  /**
   * Get the end of the month for a given date
   */
  getMonthEnd(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  }

  /**
   * Get all days in a month
   */
  getMonthDays(date: Date): Date[] {
    const start = this.getMonthStart(date);
    const end = this.getMonthEnd(date);
    const days: Date[] = [];
    const current = new Date(start);
    while (current <= end) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return days;
  }

  /**
   * Get weeks for a month view (includes days from adjacent months)
   */
  getMonthWeeks(date: Date, firstDayOfWeek: DayOfWeek = 1): Date[][] {
    const monthStart = this.getMonthStart(date);
    const monthEnd = this.getMonthEnd(date);
    const viewStart = this.getWeekStart(monthStart, firstDayOfWeek);

    const weeks: Date[][] = [];
    let current = new Date(viewStart);

    // Generate 6 weeks to ensure consistent grid
    for (let w = 0; w < 6; w++) {
      const week: Date[] = [];
      for (let d = 0; d < 7; d++) {
        week.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }
      weeks.push(week);

      // Stop if we've passed the end of the month and completed the week
      if (current > monthEnd && weeks.length >= 4) {
        break;
      }
    }

    return weeks;
  }

  /**
   * Get the start of the year for a given date
   */
  getYearStart(date: Date): Date {
    return new Date(date.getFullYear(), 0, 1, 0, 0, 0, 0);
  }

  /**
   * Get all months in a year
   */
  getYearMonths(date: Date): Date[] {
    const months: Date[] = [];
    for (let i = 0; i < 12; i++) {
      months.push(new Date(date.getFullYear(), i, 1));
    }
    return months;
  }

  /**
   * Get time slots for a day
   */
  getTimeSlots(
    date: Date,
    slotDuration: number = 1800,
    minTime: string = '00:00:00',
    maxTime: string = '24:00:00'
  ): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const [minHour, minMinute] = minTime.split(':').map(Number);
    const [maxHour, maxMinute] = maxTime.split(':').map(Number);

    const startSeconds = minHour * 3600 + minMinute * 60;
    const endSeconds = maxHour * 3600 + maxMinute * 60;

    for (let seconds = startSeconds; seconds < endSeconds; seconds += slotDuration) {
      const slotStart = new Date(date);
      slotStart.setHours(0, 0, 0, 0);
      slotStart.setSeconds(seconds);

      const slotEnd = new Date(slotStart);
      slotEnd.setSeconds(slotStart.getSeconds() + slotDuration);

      slots.push({ start: slotStart, end: slotEnd });
    }

    return slots;
  }

  /**
   * Generate a scheduler grid for week view
   */
  getWeekGrid(
    date: Date,
    firstDayOfWeek: DayOfWeek = 1,
    slotDuration: number = 1800,
    minTime: string = '00:00:00',
    maxTime: string = '24:00:00',
    timeFormat: TimeFormat = '24h'
  ): SchedulerGrid {
    const columns = this.getWeekDays(date, firstDayOfWeek);
    const rows: TimeSlotRow[] = [];
    const allSlots: TimeSlot[] = [];

    // Get time slots for the first day to determine row structure
    const daySlots = this.getTimeSlots(columns[0], slotDuration, minTime, maxTime);

    for (const slot of daySlots) {
      const rowSlots: TimeSlot[] = [];

      for (const day of columns) {
        const slotStart = new Date(day);
        slotStart.setHours(slot.start.getHours(), slot.start.getMinutes(), 0, 0);

        const slotEnd = new Date(day);
        slotEnd.setHours(slot.end.getHours(), slot.end.getMinutes(), 0, 0);

        const timeSlot: TimeSlot = { start: slotStart, end: slotEnd };
        rowSlots.push(timeSlot);
        allSlots.push(timeSlot);
      }

      rows.push({
        time: slot.start,
        label: this.formatTime(slot.start, timeFormat),
        slots: rowSlots,
      });
    }

    return { columns, rows, allSlots };
  }

  /**
   * Round a date to the nearest slot
   */
  roundToSlot(date: Date, slotDuration: number): Date {
    const ms = date.getTime();
    const slotMs = slotDuration * 1000;
    const rounded = Math.round(ms / slotMs) * slotMs;
    return new Date(rounded);
  }

  /**
   * Floor a date to the slot start
   */
  floorToSlot(date: Date, slotDuration: number): Date {
    const ms = date.getTime();
    const slotMs = slotDuration * 1000;
    const floored = Math.floor(ms / slotMs) * slotMs;
    return new Date(floored);
  }

  /**
   * Ceiling a date to the slot end
   */
  ceilToSlot(date: Date, slotDuration: number): Date {
    const ms = date.getTime();
    const slotMs = slotDuration * 1000;
    const ceiled = Math.ceil(ms / slotMs) * slotMs;
    return new Date(ceiled);
  }

  /**
   * Detect time format preference based on locale
   * Uses the Intl API to determine if the locale uses 12-hour or 24-hour time
   */
  detectTimeFormat(locale?: string): TimeFormat {
    const resolvedLocale = locale || (typeof navigator !== 'undefined' ? navigator.language : 'en-US');
    try {
      const options = new Intl.DateTimeFormat(resolvedLocale, { hour: 'numeric' }).resolvedOptions();
      return options.hour12 ? '12h' : '24h';
    } catch {
      // Fallback to 24h if detection fails
      return '24h';
    }
  }

  /**
   * Format time according to format preference
   */
  formatTime(date: Date, format: TimeFormat = '24h'): string {
    const hours = date.getHours();
    const minutes = date.getMinutes();

    if (format === '12h') {
      const period = hours >= 12 ? 'PM' : 'AM';
      const hour12 = hours % 12 || 12;
      return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
    }

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  /**
   * Format date for display
   */
  formatDate(date: Date, locale: string = 'en-US', options?: Intl.DateTimeFormatOptions): string {
    return date.toLocaleDateString(locale, options);
  }

  /**
   * Format date with weekday
   */
  formatDateWithWeekday(date: Date, locale: string = 'en-US'): string {
    return this.formatDate(date, locale, { weekday: 'short', month: 'short', day: 'numeric' });
  }

  /**
   * Get month name
   */
  getMonthName(date: Date, locale: string = 'en-US', format: 'long' | 'short' = 'long'): string {
    return date.toLocaleDateString(locale, { month: format });
  }

  /**
   * Get day name
   */
  getDayName(date: Date, locale: string = 'en-US', format: 'long' | 'short' | 'narrow' = 'short'): string {
    return date.toLocaleDateString(locale, { weekday: format });
  }

  /**
   * Check if two dates are the same day
   */
  isSameDay(date1: Date, date2: Date): boolean {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }

  /**
   * Check if two dates are the same month
   */
  isSameMonth(date1: Date, date2: Date): boolean {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth()
    );
  }

  /**
   * Check if a date is today
   */
  isToday(date: Date): boolean {
    return this.isSameDay(date, new Date());
  }

  /**
   * Check if a date is in the past
   */
  isPast(date: Date): boolean {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const check = new Date(date);
    check.setHours(0, 0, 0, 0);
    return check < now;
  }

  /**
   * Check if a date falls within a range
   */
  isInRange(date: Date, start: Date, end: Date): boolean {
    return date >= start && date <= end;
  }

  /**
   * Get the number of days between two dates
   */
  getDaysDifference(date1: Date, date2: Date): number {
    const d1 = new Date(date1);
    d1.setHours(0, 0, 0, 0);
    const d2 = new Date(date2);
    d2.setHours(0, 0, 0, 0);
    return Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
  }

  /**
   * Add days to a date
   */
  addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  /**
   * Add weeks to a date
   */
  addWeeks(date: Date, weeks: number): Date {
    return this.addDays(date, weeks * 7);
  }

  /**
   * Add months to a date
   */
  addMonths(date: Date, months: number): Date {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
  }

  /**
   * Add years to a date
   */
  addYears(date: Date, years: number): Date {
    const result = new Date(date);
    result.setFullYear(result.getFullYear() + years);
    return result;
  }

  /**
   * Get week number of the year
   */
  getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  }

  /**
   * Get seconds from midnight for a date
   */
  getSecondsFromMidnight(date: Date): number {
    return date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();
  }

  /**
   * Get duration in seconds between two dates
   */
  getDurationInSeconds(start: Date, end: Date): number {
    return Math.round((end.getTime() - start.getTime()) / 1000);
  }
}

/**
 * Singleton instance of DateService
 */
export const dateService = new DateService();
