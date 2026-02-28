import { Component, signal, ChangeDetectionStrategy} from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { SlideUpDownAnimation, SlideUpDownNgifAnimation } from '@mintplayer/ng-animations';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';

@Component({
  selector: 'demo-slide-up-down',
  templateUrl: './slide-up-down.component.html',
  styleUrls: ['./slide-up-down.component.scss'],
  animations: [SlideUpDownAnimation, SlideUpDownNgifAnimation],
  standalone: true,
  imports: [BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsButtonTypeDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SlideUpDownComponent {
  colors = Color;
  numbers = [...Array.from(Array(7)).keys()];

  slideUpDownState = signal(false);
  slideUpDownNgifState = signal(false);
}
