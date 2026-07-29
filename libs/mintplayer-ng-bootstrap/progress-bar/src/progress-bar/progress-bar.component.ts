import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';

@Component({
  selector: 'bs-progress-bar',
  templateUrl: './progress-bar.component.html',
  styleUrls: ['./progress-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.progress-bar]': 'true',
    '[class.progress-bar-striped]': 'striped()',
    '[class.progress-bar-animated]': 'animated()',
    '[class]': 'colorClassComputed()',
    '[style.width]': 'width()',
    '[attr.role]': '"progressbar"',
    '[attr.aria-valuenow]': 'value()',
    '[attr.aria-valuemin]': 'minimum()',
    '[attr.aria-valuemax]': 'maximum()',
    '[attr.aria-label]': 'ariaLabel()',
    '[attr.aria-valuetext]': 'valueText()',
  },
})
export class BsProgressBarComponent {

  minimum = input<number>(0);
  maximum = input<number>(100);
  value = input<number>(50);
  color = input<Color>(Color.primary);
  striped = input(false);
  animated = input(false);
  /** Accessible name for the progressbar. Override for localisation. */
  ariaLabel = input<string>('Progress');
  /** Human reading of the value ('3 of 5 steps') when the raw number misleads. */
  valueText = input<string | null>(null);

  percentage = computed(() => {
    const min = this.minimum();
    const max = this.maximum();
    const val = this.value();
    return (val - min) / (max - min) * 100;
  });

  width = computed(() => `${this.percentage()}%`);

  colorClassComputed = computed(() => {
    const name = Color[this.color()];
    return `bg-${name}`;
  });
}
