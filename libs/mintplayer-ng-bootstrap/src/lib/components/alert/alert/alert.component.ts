import { Component, Input } from '@angular/core';
import { FadeInOutAnimation } from '@mintplayer/ng-animations';
import { Color } from '../../../enums';

@Component({
  selector: 'bs-alert',
  templateUrl: './alert.component.html',
  styleUrls: ['./alert.component.scss'],
  animations: [ FadeInOutAnimation ]
})
export class BsAlertComponent {

  @Input() public type: Color = Color.primary;
  colors = Color;

  isVisible = true;
}
