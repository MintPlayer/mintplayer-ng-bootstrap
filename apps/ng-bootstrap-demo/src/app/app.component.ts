/// <reference types="../types" />

import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { BsNavbarComponent, BsNavbarNavComponent, BsNavbarDropdownComponent, BsNavbarDropdownLabelDirective, BsNavbarItemComponent, BsNavbarBrandComponent, BsNavbarContentDirective } from '@mintplayer/ng-bootstrap/navbar';
import { BsDropdownDividerDirective } from '@mintplayer/ng-bootstrap/dropdown-menu';
import { ViewportScroller } from '@angular/common';
import { RouterLink, RouterOutlet } from '@angular/router';
import { NavbarRouterLinkActiveDirective } from './directives/navbar-routerlink-active/navbar-router-link-active.directive';
import { BOOTSTRAP_VERSION } from './providers/bootstrap-version.provider';
import { ThemeToggleComponent } from './components/theme-toggle/theme-toggle.component';
import { FrameworkLinksComponent } from './components/framework-links/framework-links.component';

@Component({
  selector: 'demo-bootstrap-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  imports: [RouterOutlet, RouterLink, BsNavbarComponent, BsNavbarNavComponent, BsNavbarDropdownComponent, BsNavbarDropdownLabelDirective, BsNavbarItemComponent, BsNavbarBrandComponent, BsNavbarContentDirective, BsDropdownDividerDirective, NavbarRouterLinkActiveDirective, ThemeToggleComponent, FrameworkLinksComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  versionInfo = inject(BOOTSTRAP_VERSION);

  constructor() {
    inject(ViewportScroller).setOffset([0, 56]);
  }
}
