import { Pipe, PipeTransform } from '@angular/core';
import { SchedulerEventPart } from '../../interfaces/scheduler-event-part';

@Pipe({
  name: 'dateOffset'
})
export class DateOffsetPipe implements PipeTransform {

  transform(value: SchedulerEventPart) {
    const today = new Date(value.start);
    today.setHours(0); today.setMinutes(0); today.setSeconds(0);

    return (value.start.getTime() - today.getTime()) / 1000;
  }

}
