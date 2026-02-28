import { Component, ChangeDetectionStrategy} from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsProgressComponent, BsProgressBarComponent } from '@mintplayer/ng-bootstrap/progress-bar';

@Component({
  selector: 'demo-progress-bar',
  templateUrl: './progress-bar.component.html',
  styleUrls: ['./progress-bar.component.scss'],
  imports: [BsProgressComponent, BsProgressBarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProgressBarComponent {
  colors = Color;
}
