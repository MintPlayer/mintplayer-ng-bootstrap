import { Component, ChangeDetectionStrategy} from '@angular/core';

@Component({
  selector: 'bs-marquee',
  standalone: true,
  templateUrl: './marquee.component.html',
  styleUrls: ['./marquee.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsMarqueeComponent {}
