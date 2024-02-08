import { Component, Inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsNavbarModule } from '@mintplayer/ng-bootstrap/navbar';
import ngBootstrapJson from '@mintplayer/ng-bootstrap/package.json';
import { NavbarRouterLinkActiveDirective } from './directives/navbar-routerlink-active/navbar-router-link-active.directive';

@Component({
  standalone: true,
  imports: [RouterModule, BsNavbarModule, NavbarRouterLinkActiveDirective],
  providers: [
    {
      provide: 'BOOTSTRAP_VERSION',
      useValue: ngBootstrapJson.version
    }
  ],
  selector: 'demo-bootstrap-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  versionInfo = '';
  colors = Color;
  title = 'ng-bootstrap-demo';

  constructor(@Inject('BOOTSTRAP_VERSION') bootstrapVersion: string) {
    this.versionInfo = bootstrapVersion;
  }
}
