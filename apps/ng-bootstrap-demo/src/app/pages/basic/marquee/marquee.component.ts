import { Component, ChangeDetectionStrategy} from '@angular/core';
import { BsMarqueeComponent } from '@mintplayer/ng-bootstrap/marquee';

@Component({
  selector: 'demo-marquee',
  templateUrl: './marquee.component.html',
  styleUrls: ['./marquee.component.scss'],
  imports: [BsMarqueeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarqueeComponent {}
