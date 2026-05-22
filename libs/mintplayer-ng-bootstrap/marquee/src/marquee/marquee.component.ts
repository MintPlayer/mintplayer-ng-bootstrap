import { Component, ChangeDetectionStrategy, input } from '@angular/core';
@Component({
  selector: 'bs-marquee',
  templateUrl: './marquee.component.html',
  styleUrls: ['./marquee.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsMarqueeComponent {
  readonly ariaLabel = input<string | null>(null);
}
