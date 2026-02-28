import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, model, output, viewChild } from '@angular/core';
import { HS } from '../../interfaces/hs';
import { BsSliderComponent, BsThumbDirective, BsTrackDirective } from '../slider/slider.component';

@Component({
  selector: 'bs-luminosity-strip',
  templateUrl: './luminosity-strip.component.html',
  styleUrls: ['./luminosity-strip.component.scss'],
  imports: [BsSliderComponent, BsThumbDirective, BsTrackDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsLuminosityStripComponent {
  readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

  hs = model<HS>({ hue: 0, saturation: 0 });
  luminosity = model<number>(0.5);
  luminosityChange = output<number>();

  private canvasContext: CanvasRenderingContext2D | null = null;

  resultBackground = computed(() => {
    const hs = this.hs();
    const luminosity = this.luminosity();
    return `hsl(${hs.hue}, ${hs.saturation * 100}%, ${luminosity * 100}%)`;
  });

  constructor() {
    // Draw gradient when HS changes
    effect(() => {
      const hs = this.hs();
      if (this.canvasContext) {
        const width = this.canvas().nativeElement.width;
        const height = this.canvas().nativeElement.height;
        this.canvasContext.clearRect(0, 0, width, height);
        this.canvasContext.save();

        const gradient = this.canvasContext.createLinearGradient(0, 0, width, 0);
        gradient.addColorStop(0, `hsl(${hs.hue}, ${hs.saturation * 100}%, 0%)`);
        gradient.addColorStop(0.5, `hsl(${hs.hue}, ${hs.saturation * 100}%, 50%)`);
        gradient.addColorStop(1, `hsl(${hs.hue}, ${hs.saturation * 100}%, 100%)`);
        this.canvasContext.fillStyle = gradient;
        this.canvasContext.fillRect(0, 0, width, height);
      }
    });

    // Emit luminosity changes
    effect(() => {
      const luminosity = this.luminosity();
      this.luminosityChange.emit(luminosity);
    });
  }

  ngAfterViewInit() {
    if (typeof window !== 'undefined') {
      this.canvasContext = this.canvas().nativeElement.getContext('2d', { willReadFrequently: true });
    }
  }
}
