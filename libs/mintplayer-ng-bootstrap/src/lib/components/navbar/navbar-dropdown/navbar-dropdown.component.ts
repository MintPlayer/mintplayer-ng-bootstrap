import { Component, Host, OnInit, Optional, SkipSelf } from '@angular/core';

@Component({
  selector: 'bs-navbar-dropdown',
  templateUrl: './navbar-dropdown.component.html',
  styleUrls: ['./navbar-dropdown.component.scss']
})
export class BsNavbarDropdownComponent implements OnInit {

  constructor(@SkipSelf() @Host() @Optional() parentDropdown: BsNavbarDropdownComponent) {
    this.parentDropdown = parentDropdown;
  }

  parentDropdown: BsNavbarDropdownComponent;

  ngOnInit(): void {
  }

}
