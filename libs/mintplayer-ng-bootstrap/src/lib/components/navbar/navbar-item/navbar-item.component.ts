import { Component, ContentChildren, ElementRef, Input, OnInit, QueryList } from '@angular/core';
import { BsNavbarDropdownComponent } from '@mintplayer/ng-bootstrap';

@Component({
  selector: 'bs-navbar-item',
  templateUrl: './navbar-item.component.html',
  styleUrls: ['./navbar-item.component.scss']
})
export class BsNavbarItemComponent implements OnInit {

  constructor() {
  }

  ngOnInit(): void {
  }

  @ContentChildren(BsNavbarDropdownComponent) dropdowns!: QueryList<BsNavbarDropdownComponent>;
}
