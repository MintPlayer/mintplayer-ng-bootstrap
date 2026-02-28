import { Component, ChangeDetectionStrategy} from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsAlertComponent } from '@mintplayer/ng-bootstrap/alert';

@Component({
  selector: 'demo-anchor-scrolling',
  templateUrl: './anchor-scrolling.component.html',
  styleUrls: ['./anchor-scrolling.component.scss'],
  standalone: true,
  imports: [BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsAlertComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnchorScrollingComponent {
  colors = Color;
}
