import { Component, input, ChangeDetectionStrategy} from '@angular/core';
import { useBootstrap } from '@mintplayer/ng-bootstrap/machine';
import { bootstrapProgress } from '@mintplayer/ui-core/bootstrap/progress';

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
  constructor() {
    // #452: the progress partial ships with this component, scoped to the elements it stamps (data-mps="progress").
    useBootstrap(bootstrapProgress);
  }

  readonly height = input<number | null>(null);
  readonly isIndeterminate = input(false);
  readonly ariaLabel = input<string>('Loading');
}
