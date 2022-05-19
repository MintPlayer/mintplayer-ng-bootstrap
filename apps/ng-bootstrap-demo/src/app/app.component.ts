import { Component } from '@angular/core';
import { SlideUpDownAnimation } from '@mintplayer/ng-animations';
import { NgBootstrapVersion } from '@mintplayer/ng-bootstrap';

@Component({
  selector: 'mintplayer-ng-bootstrap-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  animations: [SlideUpDownAnimation]
})
export class AppComponent {
  versionInfo = NgBootstrapVersion;
}
