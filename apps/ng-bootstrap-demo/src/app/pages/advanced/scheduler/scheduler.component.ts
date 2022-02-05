import { Component } from '@angular/core';
import { ESchedulerMode } from '@mintplayer/ng-bootstrap';

@Component({
  selector: 'demo-scheduler',
  templateUrl: './scheduler.component.html',
  styleUrls: ['./scheduler.component.scss']
})
export class SchedulerComponent {
  unitHeight = 30;
  modes = ESchedulerMode;
  mode = ESchedulerMode.week;
}
