import { Component, Input } from '@angular/core';
import { BsSchedulerComponent } from '@mintplayer/ng-bootstrap/scheduler';
import { ESchedulerMode } from '../enums/scheduler-mode';
import { Resource } from '../interfaces/resource';
import { ResourceGroup } from '../interfaces/resource-group';
import { TimelineOptions } from '../interfaces/timeline-options';
import { WeekOptions } from '../interfaces/week-options';

@Component({
  selector: 'bs-scheduler',
  templateUrl: './scheduler.component.html',
  styleUrls: ['./scheduler.component.scss'],
  providers: [
    { provide: BsSchedulerComponent, useExisting: BsSchedulerMockComponent }
  ]
})
export class BsSchedulerMockComponent {
  @Input() weekOptions: WeekOptions = { unitHeight: 40 };
  @Input() timelineOptions: TimelineOptions = { unitWidth: 60 };
  @Input() mode: ESchedulerMode = ESchedulerMode.week;
  @Input() resources: (Resource | ResourceGroup)[] = [];
}
