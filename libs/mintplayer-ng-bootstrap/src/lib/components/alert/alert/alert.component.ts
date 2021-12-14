import { Component, HostBinding, Input, OnInit } from '@angular/core';
import { SlideUpDownAnimation, FadeInOutAnimation } from '@mintplayer/ng-animations';
import { Color } from '../../../enums';

@Component({
  selector: 'bs-alert',
  templateUrl: './alert.component.html',
  styleUrls: ['./alert.component.scss'],
  animations: [ SlideUpDownAnimation, FadeInOutAnimation ]
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
