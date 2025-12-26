import { ChangeDetectionStrategy, Component, computed, effect, HostBinding, input } from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';

@Component({
  selector: 'bs-progress-bar',
  templateUrl: './progress-bar.component.html',
  styleUrls: ['./progress-bar.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsProgressBarComponent {

  constructor() {
    effect(() => {
      this.colorClass = this.colorClassComputed();
      this.widthStyle = this.width();
      this.valueNow = this.value();
      this.valueMin = this.minimum();
      this.valueMax = this.maximum();
    });
  }

  minimum = input<number>(0);
  maximum = input<number>(100);
  value = input<number>(50);
  color = input<Color>(Color.primary);
  striped = input(false);
  animated = input(false);

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

  @HostBinding('class.progress-bar') progressBar = true;
  @HostBinding('class.progress-bar-striped') get stripedClass() { return this.striped(); }
  @HostBinding('class.progress-bar-animated') get animatedClass() { return this.animated(); }
  @HostBinding('class') colorClass = 'bg-primary';
  @HostBinding('style.width') widthStyle = '0';
  @HostBinding('attr.role') role = 'progressbar';
  @HostBinding('attr.aria-valuenow') valueNow = 50;
  @HostBinding('attr.aria-valuemin') valueMin = 0;
  @HostBinding('attr.aria-valuemax') valueMax = 100;
}
