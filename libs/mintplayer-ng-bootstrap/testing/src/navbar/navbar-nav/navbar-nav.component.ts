import { Component, Input } from '@angular/core';
import { BsNavbarNavComponent } from '@mintplayer/ng-bootstrap/navbar';

@Component({
  selector: 'bs-navbar-nav',
  templateUrl: './navbar-nav.component.html',
  styleUrls: ['./navbar-nav.component.scss'],
  providers: [
    { provide: BsNavbarNavComponent, useExisting: BsNavbarNavMockComponent }
  ],
})
export class BsNavbarNavMockComponent {
  @Input() collapse!: boolean;
}
