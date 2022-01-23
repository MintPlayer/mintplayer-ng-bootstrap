import { Pipe, PipeTransform } from '@angular/core';
import { SchedulerEvent } from '../../interfaces/scheduler-event';
import { SchedulerEventPart } from '../../interfaces/scheduler-event-part';

@Pipe({
  name: 'bsSecondsTodayOffset'
})
export class BsSecondsTodayOffsetPipe implements PipeTransform {

  transform(value: SchedulerEventPart | SchedulerEvent) {
    const today = new Date(value.start);
    today.setHours(0); today.setMinutes(0); today.setSeconds(0);

    return (value.start.getTime() - today.getTime()) / 1000;
  }

}
