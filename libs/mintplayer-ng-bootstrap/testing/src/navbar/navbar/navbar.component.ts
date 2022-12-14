import { Component } from '@angular/core';
import { BsNavbarComponent } from '@mintplayer/ng-bootstrap/navbar';

@Component({
  selector: 'bs-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
  providers: [
    { provide: BsNavbarComponent, useExisting: BsNavbarMockComponent }
  ],
})
export class BsNavbarMockComponent {}
