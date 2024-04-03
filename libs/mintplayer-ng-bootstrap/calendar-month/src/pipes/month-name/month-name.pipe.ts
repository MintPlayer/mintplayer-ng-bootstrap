import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'monthName',
  pure: true,
  standalone: true
})
export class BsMonthNamePipe implements PipeTransform {

  transform(date: Date | null) {
    if (date) {
      return date.toLocaleString("default", { month: 'long' });
    } else {
      return '';
    }
  }

}
