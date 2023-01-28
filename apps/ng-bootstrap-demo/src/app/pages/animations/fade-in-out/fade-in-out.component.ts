import { Component } from '@angular/core';
import { FadeInOutAnimation } from '@mintplayer/ng-animations';
import { Color } from '@mintplayer/ng-bootstrap';

@Component({
  selector: 'demo-fade-in-out',
  templateUrl: './fade-in-out.component.html',
  styleUrls: ['./fade-in-out.component.scss'],
  animations: [FadeInOutAnimation]
})
export class FadeInOutComponent {
  colors = Color;
  fadeInOutState = false;
}
