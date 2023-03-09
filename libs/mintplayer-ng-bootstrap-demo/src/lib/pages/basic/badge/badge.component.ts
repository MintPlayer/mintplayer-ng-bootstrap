import { Component, OnInit } from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';

@Component({
  selector: 'demo-badge',
  templateUrl: './badge.component.html',
  styleUrls: ['./badge.component.scss']
})
export class BadgeComponent implements OnInit {

  constructor() { }
  
  colors = Color;

  ngOnInit(): void {
  }


}
