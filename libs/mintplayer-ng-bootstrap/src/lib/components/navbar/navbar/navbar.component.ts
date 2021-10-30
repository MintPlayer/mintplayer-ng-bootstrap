import { Component, ContentChildren, OnInit, QueryList } from '@angular/core';
import { BsNavbarDropdownComponent } from '@mintplayer/ng-bootstrap';

@Component({
  selector: 'bs-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
})
export class BsNavbarComponent implements OnInit {

  constructor() {
  }

  ngOnInit() {
  }

  isExpanded = false;
  toggleExpanded() {
    this.isExpanded = !this.isExpanded;
  }
}
