import { Component, OnInit } from '@angular/core';

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

  onResized(event: Event) {
    console.log('resized', event);
  }

  isExpanded = false;
  toggleExpanded() {
    this.isExpanded = !this.isExpanded;
  }

}
