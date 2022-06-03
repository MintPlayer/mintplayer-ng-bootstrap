import { Component } from '@angular/core';
import { SlideUpDownAnimation } from '@mintplayer/ng-animations';
import ngBootstrapJson from '@mintplayer/ng-bootstrap/package.json';

@Component({
  selector: 'demo-bootstrap-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  animations: [SlideUpDownAnimation]
})
export class AppComponent {
  versionInfo = ngBootstrapJson.version;
}
