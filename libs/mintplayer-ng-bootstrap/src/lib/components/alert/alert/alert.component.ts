import { Component, HostBinding, Input, OnInit } from '@angular/core';
import { Color } from '../../../enums';

@Component({
  selector: 'bs-alert',
  templateUrl: './alert.component.html',
  styleUrls: ['./alert.component.scss']
})
export class AlertComponent implements OnInit {

  constructor() {
  }

  ngOnInit(): void {
  }

  @Input() public type: Color = Color.primary;
  colors = Color;
}
