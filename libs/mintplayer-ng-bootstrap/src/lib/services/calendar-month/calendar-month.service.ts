import { Injectable } from '@angular/core';
import { FirstAndLastDate } from '../../interfaces/first-and-last-date';
import { Week } from '../../interfaces/week';

@Injectable({
  providedIn: 'root'
})
export class BsCalendarMonthService {

  public getWeeks(month: Date) {
    const firstAndLast = this.getFirstAndLastDayOfMonth(month);
    const firstOfMonth = this.getMondayBefore(firstAndLast.first);
    const lastOfMonth = this.getSundayAfter(firstAndLast.last);
    const days = this.dateDiff(firstOfMonth, lastOfMonth) + 1;
    const firstDayOffset = (firstAndLast.first.getDay() + 7 - 1) % 7;
    const allDays = this.generateList(days).map(d => d - firstDayOffset).map(d => {
      const wrongDate = new Date(firstAndLast.first.getFullYear(), firstAndLast.first.getMonth(), firstAndLast.first.getDate() + d);
      const correctDate = new Date(wrongDate.getFullYear(), wrongDate.getMonth(), wrongDate.getDate());
      return {
        date: correctDate,
        dayOfMonth: correctDate.getDate(),
        isInMonth: (correctDate.getFullYear() === month.getFullYear()) && (correctDate.getMonth() === month.getMonth())
      };
    });
    const weeks = this.chunk(allDays, 7);
    const weeksMapped = weeks.map<Week>((w, i) => ({
      number: this.weekOfYear(new Date(month.getFullYear(), month.getMonth(), w.find(d => d.isInMonth)?.dayOfMonth)),
      days: w
    }));
    return weeksMapped;
  }
  
  generateList(count: number) {
    return [...Array(count).keys()];
  }

  dayOfWeekMondayBased(date: Date) {
    const d = date.getDay() - 1;
    if (d < 0) {
      return 6;
    } else {
      return d;
    }
  }

  weekOfYear(date: Date) {
    const dateClone = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    dateClone.setUTCDate(dateClone.getUTCDate() + 4 - (dateClone.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(dateClone.getUTCFullYear(), 0, 1));
    const utcDiff = this.toUTC(dateClone) - this.toUTC(yearStart);
    return Math.ceil((utcDiff / (1000 * 60 * 60 * 24) + 1) / 7);
  }

  getFirstAndLastDayOfMonth(date: Date) {
    const first = new Date(date.getFullYear(), date.getMonth(), 1);
    const last = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    return <FirstAndLastDate>{ first, last };
  }

  dateDiff(date1: Date, date2: Date) {
    const utc1 = this.toUTC(date1);
    const utc2 = this.toUTC(date2);
    const msPerDay = 1000 * 60 * 60 * 24;
    return Math.floor((utc2 - utc1) / msPerDay);
  }

  dayOfYear(date: Date) {
    const start = new Date(date.getFullYear(), 0, 0);
    return this.dateDiff(start, date);
  }

  toUTC(date: Date) {
    return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  }

  chunk<T>(items: T[], size: number) {
    const result: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
      result.push(items.slice(i, i + size));
    }
    return result;
  }

  getMondayBefore(date: Date) {
    const day = date.getDay(), diff = date.getDate() - day + (day == 0 ? -6 : 1); // adjust when day is sunday
    const monday = new Date(date);
    monday.setDate(diff);
    return monday;
  }

  getSundayAfter(date: Date) {
    const day = date.getDay();
    const sunday = new Date(date);
    if (day !== 0) {
      const diff = date.getDate() + 7 - day;
      sunday.setDate(diff);
    }
    return sunday;
  }
}