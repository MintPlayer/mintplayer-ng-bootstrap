import { Component, Input } from '@angular/core';
import { BsRangeComponent } from '@mintplayer/ng-bootstrap/range';

@Component({
  selector: 'bs-range',
  templateUrl: './range.component.html',
  styleUrls: ['./range.component.scss'],
  providers: [
    { provide: BsRangeComponent, useExisting: BsRangeMockComponent },
  ]
})
export class BsRangeMockComponent {
  @Input() min = 0;
  @Input() max = 10;
  @Input() step = 1;
}
