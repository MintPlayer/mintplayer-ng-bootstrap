import { Component, OnInit } from '@angular/core';
import { SlideUpDownAnimation } from '@mintplayer/ng-animations';

@Component({
  selector: 'bs-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
  animations: [SlideUpDownAnimation]
})
export class BsNavbarComponent implements OnInit {

  constructor() {
  }

  ngOnInit() {
  }

  isExpanded = false;
}
