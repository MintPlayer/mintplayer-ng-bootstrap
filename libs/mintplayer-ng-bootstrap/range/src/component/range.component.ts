import { Component, ElementRef, input, viewChild, ChangeDetectionStrategy} from '@angular/core';
import { BsRangeValueAccessor } from '../value-accessor/range-value-accessor';

@Component({
  selector: 'bs-range',
  templateUrl: './range.component.html',
  styleUrls: ['./range.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [BsRangeValueAccessor],
})
export class BsRangeComponent {
  readonly slider = viewChild.required<ElementRef<HTMLInputElement>>('slider');

  readonly min = input(0);
  readonly max = input(10);
  readonly step = input(1);
}
