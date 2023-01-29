import { isPlatformServer } from '@angular/common';
import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { SlideUpDownAnimation } from '@mintplayer/ng-animations';
import { Color } from '@mintplayer/ng-bootstrap';

@Component({
  selector: 'demo-bootstrap-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  animations: [SlideUpDownAnimation]
})
export class AppComponent {
  constructor(@Inject('BOOTSTRAP_VERSION') bootstrapVersion: string, @Inject(PLATFORM_ID) platformId: any) {
    this.versionInfo = bootstrapVersion;
    this.isServerSide = isPlatformServer(platformId);
  }

  versionInfo = '';
  colors = Color;
  isServerSide: boolean;
}
