import { Component, ElementRef, input, viewChild, ChangeDetectionStrategy} from '@angular/core';
import { useBootstrap } from '@mintplayer/ng-bootstrap/machine';
import { bootstrapForms } from '@mintplayer/ui-core/bootstrap/forms';
import { BsRangeValueAccessor } from '../value-accessor/range-value-accessor';

@Component({
  selector: 'bs-range',
  templateUrl: './range.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [BsRangeValueAccessor],
})
export class BsRangeComponent {
  constructor() {
    // #452: the forms partial ships with this component, scoped to the elements it stamps (data-mps="range").
    useBootstrap(bootstrapForms);
  }

  readonly slider = viewChild.required<ElementRef<HTMLInputElement>>('slider');

  readonly min = input(0);
  readonly max = input(10);
  readonly step = input(1);
  readonly ariaLabel = input<string | null>(null);
}
