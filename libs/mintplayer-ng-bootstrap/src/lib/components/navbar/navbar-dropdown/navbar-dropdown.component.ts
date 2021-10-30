import { Component, ContentChildren, Host, OnInit, Optional, QueryList, SkipSelf } from '@angular/core';

@Component({
  selector: 'bs-navbar-dropdown',
  templateUrl: './navbar-dropdown.component.html',
  styleUrls: ['./navbar-dropdown.component.scss']
})
export class BsNavbarDropdownComponent implements OnInit {

  constructor(@SkipSelf() @Host() @Optional() parentDropdown: BsNavbarDropdownComponent) {
    this.parentDropdown = parentDropdown;
  }

  isVisible: boolean = false;
  parentDropdown: BsNavbarDropdownComponent;

  ngOnInit(): void {
  }

  @ContentChildren(BsNavbarDropdownComponent, { descendants: true }) childDropdowns!: QueryList<BsNavbarDropdownComponent>;
}
