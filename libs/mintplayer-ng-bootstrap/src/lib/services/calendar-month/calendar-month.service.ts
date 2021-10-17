import { Injectable } from '@angular/core';
import { DateDayOfMonth } from '../../interfaces/date-day-of-month';
import { FirstAndLastDate } from '../../interfaces/first-and-last-date';
import { Week } from '../../interfaces/week';

@Injectable({
  providedIn: 'root'
})
export class BsCalendarMonthService {

  constructor() {
  }

  public getWeeks(month: Date) {
    let firstAndLast = this.getFirstAndLastDayOfMonth(month);
    let days = this.dateDiff(firstAndLast.first, firstAndLast.last) + 1;
    let allDays: (DateDayOfMonth | null)[] = [
      ...this.generateList(this.dayOfWeekMondayBased(firstAndLast.first)).map(d => null),
      ...this.generateList(days).map(d => {
        return {
          date: new Date(firstAndLast.first.getFullYear(), firstAndLast.first.getMonth(), firstAndLast.first.getDate() + d),
          dayOfMonth: d + 1,
        };
      }),
      ...this.generateList(6 - this.dayOfWeekMondayBased(firstAndLast.last)).map(d => null),
    ];
    let weeks = this.chunk(allDays, 7);
    let weeksMapped = weeks.map<Week>((w, i) => {
      return {
        number: this.weekOfYear(new Date(month.getFullYear(), month.getMonth(), w.find(d => d !== null)?.dayOfMonth)),
        week: w
      }
    });
    return weeksMapped;
  }
  
  generateList(count: number) {
    return [...Array(count).keys()];
  }

  dayOfWeekMondayBased(date: Date) {
    let d = date.getDay() - 1;
    if (d < 0) {
      return 6;
    } else {
      return d;
    }
  }

  weekOfYear(date: Date) {
    let dateClone = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    dateClone.setUTCDate(dateClone.getUTCDate() + 4 - (dateClone.getUTCDay() || 7));
    let yearStart = new Date(Date.UTC(dateClone.getUTCFullYear(), 0, 1));
    let utcDiff = this.toUTC(dateClone) - this.toUTC(yearStart);
    return Math.ceil((utcDiff / (1000 * 60 * 60 * 24) + 1) / 7);
  }

  getFirstAndLastDayOfMonth(date: Date) {
    return <FirstAndLastDate>{
      first: new Date(date.getFullYear(), date.getMonth(), 1),
      last: new Date(date.getFullYear(), date.getMonth() + 1, 0)
    };
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
    let result: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
      result.push(items.slice(i, i + size));
    }
    return result;
  }
}
