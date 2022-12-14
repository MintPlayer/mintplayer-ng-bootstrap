import { Component } from '@angular/core';
import { BsNavbarDropdownComponent } from '@mintplayer/ng-bootstrap/navbar';

@Component({
  selector: 'bs-navbar-dropdown',
  templateUrl: './navbar-dropdown.component.html',
  styleUrls: ['./navbar-dropdown.component.scss'],
  providers: [
    { provide: BsNavbarDropdownComponent, useExisting: BsNavbarDropdownMockComponent }
  ],
})
export class BsNavbarDropdownMockComponent {}
