import { Component } from '@angular/core';
import { SlideUpDownAnimation } from '@mintplayer/ng-animations';
import { Color } from '@mintplayer/ng-bootstrap';

@Component({
  selector: 'demo-collapse',
  templateUrl: './collapse.component.html',
  styleUrls: ['./collapse.component.scss'],
  animations: [SlideUpDownAnimation]
})
export class CollapseComponent {

  collapseVisible = false;
  colors = Color;

}
