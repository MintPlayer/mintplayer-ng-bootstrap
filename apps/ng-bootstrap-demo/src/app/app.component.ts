/// <reference types="../types" />

import { Component, inject, ChangeDetectionStrategy, signal } from '@angular/core';
import { SlideUpDownAnimation } from '@mintplayer/ng-animations';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsNavbarComponent, BsNavbarNavComponent, BsNavbarDropdownComponent, BsNavbarItemComponent, BsNavbarContentDirective, BsNavbarBrandComponent, BsExpandButtonDirective, BsNavbarTriggerDirective } from '@mintplayer/ng-bootstrap/navbar';
import { BsDropdownDividerDirective } from '@mintplayer/ng-bootstrap/dropdown-divider';
import { BsNavbarTogglerComponent } from '@mintplayer/ng-bootstrap/navbar-toggler';
import { ViewportScroller } from '@angular/common';
import { RouterLink, RouterOutlet } from '@angular/router';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';
import { NavbarRouterLinkActiveDirective } from './directives/navbar-routerlink-active/navbar-router-link-active.directive';
import { BOOTSTRAP_VERSION } from './providers/bootstrap-version.provider';
import { ThemeToggleComponent } from './components/theme-toggle/theme-toggle.component';

@Component({
  selector: 'demo-bootstrap-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  imports: [RouterOutlet, RouterLink, BsNavbarComponent, BsNavbarNavComponent, BsNavbarDropdownComponent, BsNavbarItemComponent, BsNavbarContentDirective, BsNavbarBrandComponent, BsExpandButtonDirective, BsNavbarTriggerDirective, BsDropdownDividerDirective, BsNavbarTogglerComponent, NavbarRouterLinkActiveDirective, ThemeToggleComponent],
  animations: [SlideUpDownAnimation],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  versionInfo = inject(BOOTSTRAP_VERSION);
  colors = Color;

  // Inline the GitHub logo as SafeHtml so `fill="currentColor"` inside the SVG
  // resolves against the surrounding link color and adapts to the page theme.
  // An <img src="..."> would treat the SVG as an external image and ignore
  // currentColor.
  readonly githubIcon = signal<SafeHtml | undefined>(undefined);

  constructor() {
    inject(ViewportScroller).setOffset([0, 56]);
    const sanitizer = inject(DomSanitizer);
    import('../assets/github.svg').then((m) => {
      this.githubIcon.set(sanitizer.bypassSecurityTrustHtml(m.default));
    });
  }
}
