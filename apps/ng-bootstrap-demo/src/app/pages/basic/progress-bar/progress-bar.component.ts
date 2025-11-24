import { Component } from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsProgressBarModule } from '@mintplayer/ng-bootstrap/progress-bar';

@Component({
  selector: 'demo-progress-bar',
  templateUrl: './progress-bar.component.html',
  styleUrls: ['./progress-bar.component.scss'],
  imports: [BsProgressBarModule]
})
export class ProgressBarComponent {
  colors = Color;
}
