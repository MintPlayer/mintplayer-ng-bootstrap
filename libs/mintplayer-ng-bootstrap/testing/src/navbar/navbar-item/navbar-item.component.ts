import { Component, ContentChildren, QueryList } from '@angular/core';
import { BsNavbarDropdownComponent, BsNavbarItemComponent } from '@mintplayer/ng-bootstrap/navbar';

@Component({
  selector: 'bs-navbar-item',
  templateUrl: './navbar-item.component.html',
  styleUrls: ['./navbar-item.component.scss'],
  providers: [
    { provide: BsNavbarItemComponent, useExisting: BsNavbarItemMockComponent }
  ],
})
export class BsNavbarItemMockComponent {
  @ContentChildren(BsNavbarDropdownComponent) dropdowns!: QueryList<BsNavbarDropdownComponent>;
}
