import { Pipe, PipeTransform } from '@angular/core';
import { FullCalendarEventPart } from '../../interfaces/fullcalendar-event-part';

@Pipe({
  name: 'dayOfWeek'
})
export class DayOfWeekPipe implements PipeTransform {

  transform(value: FullCalendarEventPart) {
    const dayOfWeek = value.start.getDay();
    if (dayOfWeek === 0) {
      return 7;
    } else {
      return dayOfWeek;
    }
  }

}
