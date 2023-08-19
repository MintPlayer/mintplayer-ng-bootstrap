import { AfterViewInit, Component, Inject } from '@angular/core';
import { SlideUpDownAnimation } from '@mintplayer/ng-animations';
import { Color } from '@mintplayer/ng-bootstrap';
import type { NavbarComponent } from './components/navbar/navbar.component';

@Component({
  selector: 'demo-bootstrap-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  animations: [SlideUpDownAnimation]
})
export class AppComponent implements AfterViewInit {
  constructor(@Inject('BOOTSTRAP_VERSION') bootstrapVersion: string) {
    this.versionInfo = bootstrapVersion;
  }

  versionInfo = '';
  colors = Color;
  navbarLoader?: Promise<typeof NavbarComponent>;
  
  ngAfterViewInit() {
    this.navbarLoader = import('./components/navbar/navbar.component')
      .then(({ NavbarComponent }) => NavbarComponent);
  }
}