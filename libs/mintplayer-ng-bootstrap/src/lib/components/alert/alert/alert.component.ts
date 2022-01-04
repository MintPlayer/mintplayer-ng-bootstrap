import { Component, Input, OnInit } from '@angular/core';
import { FadeInOutAnimation } from '@mintplayer/ng-animations';
import { Color } from '../../../enums';

@Component({
  selector: 'bs-alert',
  templateUrl: './alert.component.html',
  styleUrls: ['./alert.component.scss'],
  animations: [ FadeInOutAnimation ]
})
export class BsAlertComponent implements OnInit {

  constructor() {
  }

  ngOnInit(): void {
  }

  @Input() public type: Color = Color.primary;
  colors = Color;

  isVisible: boolean = true;
}
