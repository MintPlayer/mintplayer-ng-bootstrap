import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, input, model, output, viewChild } from '@angular/core';
import { HS } from '../../interfaces/hs';
import { BsSliderComponent, BsThumbDirective, BsTrackDirective } from '../slider/slider.component';
import { hsv2rgb } from '../../color-math';

@Component({
  selector: 'bs-brightness-strip',
  templateUrl: './brightness-strip.component.html',
  styleUrls: ['./brightness-strip.component.scss'],
  imports: [BsSliderComponent, BsThumbDirective, BsTrackDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsBrightnessStripComponent {
  readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

  disabled = input<boolean>(false);
  hs = model<HS>({ hue: 0, saturation: 0 });
  brightness = model<number>(1);
  brightnessChange = output<number>();

  private canvasContext: CanvasRenderingContext2D | null = null;

  resultBackground = computed(() => {
    const hs = this.hs();
    const brightness = this.brightness();
    const rgb = hsv2rgb({ hue: hs.hue, saturation: hs.saturation, value: brightness });
    return `rgb(${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)})`;
  });

  constructor() {
    effect(() => {
      const hs = this.hs();
      if (this.canvasContext) {
        const width = this.canvas().nativeElement.width;
        const height = this.canvas().nativeElement.height;
        this.canvasContext.clearRect(0, 0, width, height);
        this.canvasContext.save();

        const peak = hsv2rgb({ hue: hs.hue, saturation: hs.saturation, value: 1 });
        const gradient = this.canvasContext.createLinearGradient(0, 0, width, 0);
        gradient.addColorStop(0, 'rgb(0, 0, 0)');
        gradient.addColorStop(1, `rgb(${Math.round(peak.r)}, ${Math.round(peak.g)}, ${Math.round(peak.b)})`);
        this.canvasContext.fillStyle = gradient;
        this.canvasContext.fillRect(0, 0, width, height);
      }
    });

    effect(() => {
      const brightness = this.brightness();
      this.brightnessChange.emit(brightness);
    });
  }

  ngAfterViewInit() {
    if (typeof window !== 'undefined') {
      this.canvasContext = this.canvas().nativeElement.getContext('2d', { willReadFrequently: true });
    }
  }
}
