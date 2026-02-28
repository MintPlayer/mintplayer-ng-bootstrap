import { Component, inject, ChangeDetectionStrategy} from '@angular/core';
import { SlideUpDownAnimation } from '@mintplayer/ng-animations';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsNavbarComponent, BsNavbarNavComponent, BsNavbarDropdownComponent, BsNavbarItemComponent, BsNavbarContentDirective, BsNavbarBrandComponent, BsExpandButtonDirective } from '@mintplayer/ng-bootstrap/navbar';
import { BsDropdownDividerDirective } from '@mintplayer/ng-bootstrap/dropdown-divider';
import { BsNavbarTogglerComponent } from '@mintplayer/ng-bootstrap/navbar-toggler';
import { ViewportScroller } from '@angular/common';
import { RouterLink, RouterOutlet } from '@angular/router';
import { NavbarRouterLinkActiveDirective } from './directives/navbar-routerlink-active/navbar-router-link-active.directive';
import { BOOTSTRAP_VERSION } from './providers/bootstrap-version.provider';

@Component({
  selector: 'demo-bootstrap-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  imports: [RouterOutlet, RouterLink, BsNavbarComponent, BsNavbarNavComponent, BsNavbarDropdownComponent, BsNavbarItemComponent, BsNavbarContentDirective, BsNavbarBrandComponent, BsExpandButtonDirective, BsDropdownDividerDirective, BsNavbarTogglerComponent, NavbarRouterLinkActiveDirective],
  animations: [SlideUpDownAnimation],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  versionInfo = inject(BOOTSTRAP_VERSION);
  colors = Color;

  constructor() {
    inject(ViewportScroller).setOffset([0, 56]);
  }
}
