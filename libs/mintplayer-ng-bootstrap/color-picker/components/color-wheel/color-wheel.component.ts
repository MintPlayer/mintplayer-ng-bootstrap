import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, input, model, output, signal, viewChild } from '@angular/core';
import { HS } from '../../interfaces/hs';
import { hs2polar, polar2hs } from '../../color-math';

@Component({
  selector: 'bs-color-wheel',
  templateUrl: './color-wheel.component.html',
  styleUrls: ['./color-wheel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'class': 'position-relative',
    '(document:mousemove)': 'onPointerMove($event)',
    '(document:mouseup)': 'onPointerUp($event)',
  },
})
export class BsColorWheelComponent {
  readonly surface = viewChild.required<ElementRef<HTMLDivElement>>('surface');

  width = model<number>(150);
  height = model<number>(150);
  brightness = model<number>(1);

  hs = model<HS>({ hue: 0, saturation: 0 });
  hsChange = output<HS>();

  disabled = input<boolean>(false);
  private readonly isPointerDown = signal<boolean>(false);

  squareSize = computed(() => Math.min(this.width(), this.height()));
  shiftX = computed(() => Math.max(0, (this.width() - this.height()) / 2));
  shiftY = computed(() => Math.max(0, (this.height() - this.width()) / 2));
  outerRadius = computed(() => this.squareSize() / 2);

  overlayOpacity = computed(() => 1 - this.brightness());

  markerPosition = computed(() => {
    const hs = this.hs();
    const radius = this.outerRadius();
    const cx = this.shiftX() + radius;
    const cy = this.shiftY() + radius;
    const { dx, dy } = hs2polar(hs.hue, hs.saturation, radius);
    return { x: cx + dx, y: cy + dy };
  });

  constructor() {
    effect(() => {
      const hs = this.hs();
      this.hsChange.emit(hs);
    });
  }

  onPointerDown(ev: MouseEvent | TouchEvent) {
    if (this.disabled()) return;
    if (!('touches' in ev)) ev.preventDefault();
    ev.stopPropagation();
    this.isPointerDown.set(true);
    this.updateColor(ev);
  }

  onPointerMove(ev: MouseEvent | TouchEvent) {
    if (!this.isPointerDown()) return;
    if (!('touches' in ev)) ev.preventDefault();
    ev.stopPropagation();
    this.updateColor(ev);
  }

  onPointerUp(_ev: MouseEvent | TouchEvent) {
    this.isPointerDown.set(false);
  }

  private updateColor(ev: MouseEvent | TouchEvent) {
    const rect = this.surface().nativeElement.getBoundingClientRect();
    const clientX = 'touches' in ev ? ev.touches[0].clientX : ev.clientX;
    const clientY = 'touches' in ev ? ev.touches[0].clientY : ev.clientY;

    const radius = this.outerRadius();
    const dx = clientX - rect.left - radius;
    const dy = clientY - rect.top - radius;

    const hs = polar2hs(dx, dy, radius);
    this.hs.set(hs);
  }
}
