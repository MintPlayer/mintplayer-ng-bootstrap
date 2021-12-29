import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'monthName'
})
export class MonthNamePipe implements PipeTransform {

  transform(date: Date | null, ...args: any[]) {
    if (date) {
      return date.toLocaleString("default", { month: 'long' });
    } else {
      return '';
    }
  }

}
