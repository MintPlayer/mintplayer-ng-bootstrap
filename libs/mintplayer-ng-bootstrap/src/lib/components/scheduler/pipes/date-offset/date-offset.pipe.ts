import { Pipe, PipeTransform } from '@angular/core';
import { FullCalendarEventPart } from '../../interfaces/fullcalendar-event-part';

@Pipe({
  name: 'dateOffset'
})
export class DateOffsetPipe implements PipeTransform {

  transform(value: FullCalendarEventPart) {
    const today = new Date(value.start);
    today.setHours(0); today.setMinutes(0); today.setSeconds(0);

    return (value.start.getTime() - today.getTime()) / 1000;
  }

}
