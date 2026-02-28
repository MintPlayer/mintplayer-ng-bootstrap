import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';

@Component({
  selector: 'bs-spinner',
  templateUrl: './spinner.component.html',
  styleUrls: ['./spinner.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsSpinnerComponent {
  colors = Color;

  type = input<'border' | 'grow'>('border');
  color = input<Color>(Color.dark);

  spinnerClass = computed(() => `spinner-${this.type()}`);
  colorClass = computed(() => `text-${this.colors[this.color()]}`);
}
