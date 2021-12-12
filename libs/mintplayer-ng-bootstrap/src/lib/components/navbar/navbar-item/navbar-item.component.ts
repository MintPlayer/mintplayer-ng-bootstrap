import { Component, Optional } from '@angular/core';
import { BsNavbarDropdownComponent } from '../navbar-dropdown/navbar-dropdown.component';

@Component({
  selector: 'bs-navbar-item',
  templateUrl: './navbar-item.component.html',
  styleUrls: ['./navbar-item.component.scss']
})
export class BsNavbarItemComponent {

  constructor(@Optional() parentDropdown: BsNavbarDropdownComponent) {
    this.parentDropdown = parentDropdown;
  }

  parentDropdown: BsNavbarDropdownComponent;

  // @ContentChildren(forwardRef(() => BsNavbarDropdownComponent)) dropdowns!: QueryList<BsNavbarDropdownComponent>;
}
