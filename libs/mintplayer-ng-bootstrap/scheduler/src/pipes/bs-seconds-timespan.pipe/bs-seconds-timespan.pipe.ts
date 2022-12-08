import { Pipe, PipeTransform } from '@angular/core';
import { SchedulerEvent } from '../../interfaces/scheduler-event';
import { SchedulerEventPart } from '../../interfaces/scheduler-event-part';

@Pipe({
  name: 'bsSecondsTimespan'
})
export class BsSecondsTimespanPipe implements PipeTransform {

  transform(value: SchedulerEventPart | SchedulerEvent) {
    return (value.end.getTime() - value.start.getTime()) / 1000;
  }

}
