import { Component, input, ChangeDetectionStrategy} from '@angular/core';

@Component({
  selector: 'bs-progress',
  templateUrl: './progress.component.html',
  styleUrls: ['./progress.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[style.height.px]': 'height()',
    '[class.d-block]': 'true',
    '[class.overflow-hidden]': 'true',
  },
})
export class BsProgressComponent {
  readonly height = input<number | null>(null);
  readonly isIndeterminate = input(false);
}
