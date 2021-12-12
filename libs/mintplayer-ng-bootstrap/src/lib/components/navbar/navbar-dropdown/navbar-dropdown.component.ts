import { Component, ContentChildren, ElementRef, forwardRef, Host, Inject, OnInit, Optional, QueryList, SkipSelf } from '@angular/core';
import { BsNavbarItemComponent } from '../navbar-item/navbar-item.component';

@Component({
  selector: 'bs-navbar-dropdown',
  templateUrl: './navbar-dropdown.component.html',
  styleUrls: ['./navbar-dropdown.component.scss']
})
export class BsNavbarDropdownComponent {

  constructor(
    @Host() @Inject(forwardRef(() => 'bniComponent')) navbarItem: BsNavbarItemComponent
  ) {
    this.navbarItem = navbarItem;
  }

  navbarItem: BsNavbarItemComponent;
  
}
