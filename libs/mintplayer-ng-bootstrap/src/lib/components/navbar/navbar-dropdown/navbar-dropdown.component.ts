import { Component, ContentChildren, ElementRef, Host, OnInit, Optional, QueryList, SkipSelf } from '@angular/core';
import { BsNavbarItemComponent } from '../navbar-item/navbar-item.component';

@Component({
  selector: 'bs-navbar-dropdown',
  templateUrl: './navbar-dropdown.component.html',
  styleUrls: ['./navbar-dropdown.component.scss']
})
export class BsNavbarDropdownComponent implements OnInit {

  constructor(
    @SkipSelf() @Host() @Optional() parentDropdown: BsNavbarDropdownComponent,
    @Host() navbarItem: BsNavbarItemComponent
  ) {
    this.parentDropdown = parentDropdown;
    this.navbarItem = navbarItem;
  }

  isVisible: boolean = false;
  navbarItem: BsNavbarItemComponent;
  parentDropdown: BsNavbarDropdownComponent;

  get elementsToExclude() {
    return [this.navbarItem.anchorTag].filter((a) => a).map((a) => <HTMLElement>a);
  }

  ngOnInit(): void {
  }

  @ContentChildren(BsNavbarDropdownComponent, { descendants: true }) childDropdowns!: QueryList<BsNavbarDropdownComponent>;
}
