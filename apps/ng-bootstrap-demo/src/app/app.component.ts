import { Component, Inject } from '@angular/core';
import { SlideUpDownAnimation } from '@mintplayer/ng-animations';
import { Color } from '@mintplayer/ng-bootstrap';

@Component({
  selector: 'demo-bootstrap-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  animations: [SlideUpDownAnimation]
})
export class AppComponent {
  constructor(@Inject('BOOTSTRAP_VERSION') bootstrapVersion: string) {
    this.versionInfo = bootstrapVersion;
  }
  
  versionInfo = '';
  colors = Color;
}
