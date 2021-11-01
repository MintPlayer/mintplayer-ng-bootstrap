import { Component, ElementRef, ViewChild } from '@angular/core';

@Component({
  selector: 'bs-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
})
export class BsNavbarComponent {

  constructor() {
  }

  isExpanded = false;
  toggleExpanded() {
    this.isExpanded = !this.isExpanded;
  }

  @ViewChild('nav') nav!: ElementRef;
}
