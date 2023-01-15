import { Component } from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { SlideUpDownAnimation, SlideUpDownNgifAnimation } from '@mintplayer/ng-animations';

@Component({
  selector: 'demo-slide-up-down',
  templateUrl: './slide-up-down.component.html',
  styleUrls: ['./slide-up-down.component.scss'],
  animations: [SlideUpDownAnimation, SlideUpDownNgifAnimation]
})
export class SlideUpDownComponent {
  colors = Color;
  numbers = [...Array.from(Array(7)).keys()];

  slideUpDownState = false;
  slideUpDownNgifState = false;
}
