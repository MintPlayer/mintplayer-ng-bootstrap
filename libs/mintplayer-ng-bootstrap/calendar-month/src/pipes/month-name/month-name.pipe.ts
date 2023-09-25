import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'monthName',
  pure: true
})
export class MonthNamePipe implements PipeTransform {

  transform(date: Date | null) {
    if (date) {
      return date.toLocaleString("default", { month: 'long' });
    } else {
      return '';
    }
  }

}
