import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'weekdayName'
})
export class WeekdayNamePipe implements PipeTransform {

  transform(date: Date, ...args: any[]): unknown {
    return date.toLocaleString("default", { weekday: 'short' });
  }

}
