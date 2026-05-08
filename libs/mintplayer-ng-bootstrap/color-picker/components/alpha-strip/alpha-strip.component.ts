import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, input, model, output, viewChild } from '@angular/core';
import { HS } from '../../interfaces/hs';
import { BsSliderComponent, BsThumbDirective, BsTrackDirective } from '../slider/slider.component';
import { hsv2rgb } from '../../color-math';

@Component({
  selector: 'bs-alpha-strip',
  templateUrl: './alpha-strip.component.html',
  styleUrls: ['./alpha-strip.component.scss'],
  imports: [BsSliderComponent, BsThumbDirective, BsTrackDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsAlphaStripComponent {
  readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('track');

  disabled = input<boolean>(false);
  hs = model<HS>({ hue: 0, saturation: 0 });
  brightness = model<number>(1);
  alpha = model<number>(1);
  alphaChange = output<number>();

  private canvasContext: CanvasRenderingContext2D | null = null;

  resultBackground = computed(() => {
    const hs = this.hs();
    const brightness = this.brightness();
    const alpha = this.alpha();
    const rgb = hsv2rgb({ hue: hs.hue, saturation: hs.saturation, value: brightness });
    return `rgba(${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)}, ${alpha})`;
  });

  constructor() {
    effect(() => {
      const hs = this.hs();
      const brightness = this.brightness();
      setTimeout(() => {
        if (this.canvasContext) {
          const width = this.canvas().nativeElement.width;
          const height = this.canvas().nativeElement.height;
          this.canvasContext.clearRect(0, 0, width, height);
          this.canvasContext.save();

          const rgb = hsv2rgb({ hue: hs.hue, saturation: hs.saturation, value: brightness });
          const r = Math.round(rgb.r), g = Math.round(rgb.g), b = Math.round(rgb.b);
          const gradient = this.canvasContext.createLinearGradient(0, 0, width, 0);
          gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0)`);
          gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 1)`);
          this.canvasContext.fillStyle = gradient;
          this.canvasContext.fillRect(0, 0, width, height);
        }
      });
    });

    effect(() => {
      const alpha = this.alpha();
      this.alphaChange.emit(alpha);
    });
  }

  ngAfterViewInit() {
    if (typeof window !== 'undefined') {
      this.canvasContext = this.canvas().nativeElement.getContext('2d', { willReadFrequently: true });
    }
  }
}
