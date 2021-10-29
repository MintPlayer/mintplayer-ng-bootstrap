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

  isExpanded = false;
}
