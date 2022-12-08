import { Pipe, PipeTransform } from '@angular/core';
import { SchedulerEvent } from '../../interfaces/scheduler-event';
import { SchedulerEventPart } from '../../interfaces/scheduler-event-part';

@Pipe({
  name: 'dayOfWeek'
})
export class DayOfWeekPipe implements PipeTransform {

  transform(value: SchedulerEventPart | SchedulerEvent) {
    const dayOfWeek = value.start.getDay();
    if (dayOfWeek === 0) {
      return 7;
    } else {
      return dayOfWeek;
    }
  }

}
