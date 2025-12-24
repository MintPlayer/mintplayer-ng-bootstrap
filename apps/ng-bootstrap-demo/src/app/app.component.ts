import { Component, inject } from '@angular/core';
import { SlideUpDownAnimation } from '@mintplayer/ng-animations';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsNavbarModule } from '@mintplayer/ng-bootstrap/navbar';
import { ViewportScroller } from '@angular/common';
import { RouterLink, RouterOutlet } from '@angular/router';
import { NavbarRouterLinkActiveDirective } from './directives/navbar-routerlink-active/navbar-router-link-active.directive';
import { BOOTSTRAP_VERSION } from './providers/bootstrap-version.provider';

@Component({
  selector: 'demo-bootstrap-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: true,
  imports: [RouterOutlet, RouterLink, BsNavbarModule, NavbarRouterLinkActiveDirective],
  animations: [SlideUpDownAnimation]
})
export class AppComponent {
  versionInfo = inject(BOOTSTRAP_VERSION);
  colors = Color;

  constructor() {
    inject(ViewportScroller).setOffset([0, 56]);
  }
}
