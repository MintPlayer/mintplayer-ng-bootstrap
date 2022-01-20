import { Pipe, PipeTransform } from '@angular/core';
import { FullCalendarEventPart } from '../../interfaces/fullcalendar-event-part';

@Pipe({
  name: 'bsSecondsTimespan'
})
export class BsSecondsTimespanPipe implements PipeTransform {

  transform(value: FullCalendarEventPart) {
    return (value.end.getTime() - value.start.getTime()) / 1000;
  }

}
