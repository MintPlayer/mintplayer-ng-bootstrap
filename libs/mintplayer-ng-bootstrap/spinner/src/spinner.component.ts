import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { useBootstrap } from '@mintplayer/ng-bootstrap/machine';
import { bootstrapSpinners } from '@mintplayer/ui-core/bootstrap';
import { Color } from '@mintplayer/ng-bootstrap';

@Component({
  selector: 'bs-spinner',
  templateUrl: './spinner.component.html',
  styleUrls: ['./spinner.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsSpinnerComponent {
  constructor() {
    // #452: the spinners partial ships with this component, scoped to the elements it stamps (data-mps="spinner").
    useBootstrap(bootstrapSpinners);
  }

  readonly colors = Color;

  type = input<'border' | 'grow'>('border');
  color = input<Color>(Color.dark);

  spinnerClass = computed(() => `spinner-${this.type()}`);
  colorClass = computed(() => `text-${this.colors[this.color()]}`);
}
