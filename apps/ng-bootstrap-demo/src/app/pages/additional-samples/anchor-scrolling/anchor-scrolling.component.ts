import { Component, ChangeDetectionStrategy} from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { BsAlertModule } from '@mintplayer/ng-bootstrap/alert';

@Component({
  selector: 'demo-anchor-scrolling',
  templateUrl: './anchor-scrolling.component.html',
  styleUrls: ['./anchor-scrolling.component.scss'],
  standalone: true,
  imports: [BsGridModule, BsAlertModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnchorScrollingComponent {
  colors = Color;
}
