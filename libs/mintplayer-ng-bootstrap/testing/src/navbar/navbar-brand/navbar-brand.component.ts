import { Component } from '@angular/core';
import { BsNavbarBrandComponent } from '@mintplayer/ng-bootstrap/navbar';

@Component({
  selector: 'bs-navbar-brand',
  templateUrl: './navbar-brand.component.html',
  styleUrls: ['./navbar-brand.component.scss'],
  providers: [
    { provide: BsNavbarBrandComponent, useExisting: BsNavbarBrandMockComponent }
  ],
})
export class BsNavbarBrandMockComponent {}
