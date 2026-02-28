import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'weekdayName',
  pure: true,
})
export class BsWeekdayNamePipe implements PipeTransform {

  transform(date: Date): unknown {
    return date.toLocaleString("default", { weekday: 'short' });
  }

}
