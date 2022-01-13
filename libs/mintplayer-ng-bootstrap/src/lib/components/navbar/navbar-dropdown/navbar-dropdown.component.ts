import { Component, ContentChildren, forwardRef, Host, Inject, Input, Optional, QueryList, SkipSelf } from '@angular/core';
import { BsNavbarItemComponent } from '../navbar-item/navbar-item.component';

@Component({
  selector: 'bs-navbar-dropdown',
  templateUrl: './navbar-dropdown.component.html',
  styleUrls: ['./navbar-dropdown.component.scss']
})
export class BsNavbarDropdownComponent {

  constructor(
    @SkipSelf() @Host() @Optional() parentDropdown: BsNavbarDropdownComponent,
    @Host() @Inject(forwardRef(() => BsNavbarItemComponent)) navbarItem: BsNavbarItemComponent
  ) {
    this.parentDropdown = parentDropdown;
    this.navbarItem = navbarItem;
  }

  @Input() public autoclose = true;
  isVisible = false;
  navbarItem: BsNavbarItemComponent;
  parentDropdown: BsNavbarDropdownComponent;

  get elementsToExclude() {
    return [this.navbarItem.anchorTag].filter((a) => a).map((a) => <HTMLElement>a);
  }

  @ContentChildren(forwardRef(() => BsNavbarDropdownComponent), { descendants: true }) childDropdowns!: QueryList<BsNavbarDropdownComponent>;
}
