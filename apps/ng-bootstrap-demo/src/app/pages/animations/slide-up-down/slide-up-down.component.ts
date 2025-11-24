import { Component } from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { SlideUpDownAnimation, SlideUpDownNgifAnimation } from '@mintplayer/ng-animations';
import { BsGridColumnDirective, BsGridComponent, BsGridRowDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';

@Component({
  selector: 'demo-slide-up-down',
  templateUrl: './slide-up-down.component.html',
  styleUrls: ['./slide-up-down.component.scss'],
  animations: [SlideUpDownAnimation, SlideUpDownNgifAnimation],
  imports: [BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsButtonTypeDirective]
})
export class SlideUpDownComponent {
  colors = Color;
  numbers = [...Array.from(Array(7)).keys()];

  slideUpDownState = false;
  slideUpDownNgifState = false;
}
