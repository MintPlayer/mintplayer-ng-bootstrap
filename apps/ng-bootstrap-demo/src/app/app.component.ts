import { Component } from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';

@Component({
  selector: 'mintplayer-ng-bootstrap-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  title = 'ng-bootstrap-demo';
  colors = Color;
  mode: 'slide' | 'fade' = 'slide';

  onModeChange(value: any) {
    console.log('value change', value);
    this.mode = value;
  }
}
