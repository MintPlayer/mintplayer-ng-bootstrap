import { Component, ElementRef, input, viewChild, ChangeDetectionStrategy} from '@angular/core';

@Component({
  selector: 'bs-range',
  templateUrl: './range.component.html',
  styleUrls: ['./range.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsRangeComponent {
  readonly slider = viewChild.required<ElementRef<HTMLInputElement>>('slider');

  readonly min = input(0);
  readonly max = input(10);
  readonly step = input(1);
}
