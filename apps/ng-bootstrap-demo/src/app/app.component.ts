import { Component } from '@angular/core';
import { SlideUpDownAnimation } from '@mintplayer/ng-animations';

@Component({
  selector: 'mintplayer-ng-bootstrap-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  animations: [SlideUpDownAnimation]
})
export class AppComponent {
}
