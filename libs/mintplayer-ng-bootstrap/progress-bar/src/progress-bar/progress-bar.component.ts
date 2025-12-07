import { Component, HostBinding, Input, signal, computed, effect } from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';

@Component({
  selector: 'bs-progress-bar',
  templateUrl: './progress-bar.component.html',
  styleUrls: ['./progress-bar.component.scss'],
  standalone: false,
})
export class BsProgressBarComponent {

  constructor() {
    this.percentage = computed(() => {
      const minimum = this.minimumSignal();
      const maximum = this.maximumSignal();
      const value = this.valueSignal();
      return (value - minimum) / (maximum - minimum) * 100;
    });
    this.width = computed(() => {
      return String(this.percentage()) + '%';
    });
    this.colorClassComputed = computed(() => {
      const color = this.colorSignal();
      const name = Color[color];
      return `bg-${name}`;
    });

    effect(() => {
      this.colorClass = this.colorClassComputed();
    });
    effect(() => {
      this.widthStyle = this.width();
    });
    effect(() => {
      this.valueNow = this.valueSignal();
    });
    effect(() => {
      this.valueMin = this.minimumSignal();
    });
    effect(() => {
      this.valueMax = this.maximumSignal();
    });
  }

  minimumSignal = signal<number>(0);
  maximumSignal = signal<number>(100);
  valueSignal = signal<number>(50);
  percentage;
  width;
  colorSignal = signal<Color>(Color.primary);
  colorClassComputed;

  @Input() public set minimum(value: number) {
    this.minimumSignal.set(value);
  }
  @Input() public set maximum(value: number) {
    this.maximumSignal.set(value);
  }
  @Input() public set value(value: number) {
    this.valueSignal.set(value);
  }
  @Input() public set color(value: Color) {
    this.colorSignal.set(value);
  }
  @Input() @HostBinding('class.progress-bar-striped') public striped = false;
  @Input() @HostBinding('class.progress-bar-animated') public animated = false;

  @HostBinding('class.progress-bar') progressBar = true;
  @HostBinding('class') colorClass = 'bg-primary';
  @HostBinding('style.width') widthStyle = '0';
  @HostBinding('attr.role') role = 'progressbar';
  @HostBinding('attr.aria-valuenow') valueNow = 50;
  @HostBinding('attr.aria-valuemin') valueMin = 0;
  @HostBinding('attr.aria-valuemax') valueMax = 100;
}
