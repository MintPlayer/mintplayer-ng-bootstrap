import { Component, Input } from '@angular/core';
import { Color } from '../../common';

@Component({
  selector: 'bs-progress-bar',
  templateUrl: './progress-bar.component.html',
  styleUrls: ['./progress-bar.component.scss'],
})
export class BsProgressBarMockComponent {
  @Input() public minimum = 0;
  @Input() public maximum = 100;
  @Input() public value = 50;
  @Input() public color = Color;
  @Input() public striped = false;
  @Input() public animated = false;
}
