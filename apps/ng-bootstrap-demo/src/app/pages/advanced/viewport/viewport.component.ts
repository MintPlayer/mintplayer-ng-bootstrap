import { Component, ChangeDetectionStrategy} from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsAlertComponent } from '@mintplayer/ng-bootstrap/alert';
import { BsInViewportDirective } from '@mintplayer/ng-bootstrap/viewport';

@Component({
  selector: 'demo-viewport',
  templateUrl: './viewport.component.html',
  styleUrls: ['./viewport.component.scss'],
  standalone: true,
  imports: [BsAlertComponent, BsInViewportDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ViewportComponent {
  colors = Color;

  box1InViewport = false;
  box2InViewport = false;
  box3InViewport = false;

  onBox1ViewportChange(isInViewport: boolean) {
    this.box1InViewport = isInViewport;
  }

  onBox2ViewportChange(isInViewport: boolean) {
    this.box2InViewport = isInViewport;
  }

  onBox3ViewportChange(isInViewport: boolean) {
    this.box3InViewport = isInViewport;
  }
}
