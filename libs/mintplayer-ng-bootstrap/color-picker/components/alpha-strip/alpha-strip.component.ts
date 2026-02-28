import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, model, output, viewChild } from '@angular/core';
import { HS } from '../../interfaces/hs';
import { BsSliderComponent, BsThumbDirective, BsTrackDirective } from '../slider/slider.component';

@Component({
  selector: 'bs-alpha-strip',
  templateUrl: './alpha-strip.component.html',
  styleUrls: ['./alpha-strip.component.scss'],
  imports: [BsSliderComponent, BsThumbDirective, BsTrackDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsAlphaStripComponent {
  readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('track');

  hs = model<HS>({ hue: 0, saturation: 0 });
  luminosity = model<number>(0.5);
  alpha = model<number>(1);
  alphaChange = output<number>();

  private canvasContext: CanvasRenderingContext2D | null = null;

  resultBackground = computed(() => {
    const hs = this.hs();
    const luminosity = this.luminosity();
    const alpha = this.alpha();
    return `hsla(${hs.hue}, ${hs.saturation * 100}%, ${luminosity * 100}%, ${alpha})`;
  });

  constructor() {
    // Draw gradient when HS or luminosity changes
    effect(() => {
      const hs = this.hs();
      const luminosity = this.luminosity();
      setTimeout(() => {
        if (this.canvasContext) {
          const width = this.canvas().nativeElement.width;
          const height = this.canvas().nativeElement.height;
          this.canvasContext.clearRect(0, 0, width, height);
          this.canvasContext.save();

          const gradient = this.canvasContext.createLinearGradient(0, 0, width, 0);
          gradient.addColorStop(0, `hsla(${hs.hue}, ${hs.saturation * 100}%, ${luminosity * 100}%, 0)`);
          gradient.addColorStop(1, `hsla(${hs.hue}, ${hs.saturation * 100}%, ${luminosity * 100}%, 1)`);
          this.canvasContext.fillStyle = gradient;
          this.canvasContext.fillRect(0, 0, width, height);
        }
      });
    });

    // Emit alpha changes
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
