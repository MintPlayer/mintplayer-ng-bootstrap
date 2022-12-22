import { Component, NgModule, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BsNavbarModule } from '@mintplayer/ng-bootstrap/navbar';
import { DirectivesModule } from '../../directives/directives.module';

@Component({
  selector: 'demo-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
})
export class NavbarComponent {
  constructor(@Inject('BOOTSTRAP_VERSION') bootstrapVersion: string) {
    this.versionInfo = bootstrapVersion;
  }

  versionInfo?: string;
}

@NgModule({
  declarations: [NavbarComponent],
  imports: [
    CommonModule,
    RouterModule,
    BsNavbarModule,
    DirectivesModule,
  ],
  exports: [NavbarComponent],
})
export class NavbarModule {}