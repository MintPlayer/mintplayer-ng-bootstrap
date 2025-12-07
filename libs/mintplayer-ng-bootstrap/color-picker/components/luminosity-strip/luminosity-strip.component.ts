import { Component, EventEmitter, Input, Output, AfterViewInit, ViewChild, ElementRef, signal, computed, effect } from '@angular/core';
import { HS } from '../../interfaces/hs';

@Component({
  selector: 'bs-luminosity-strip',
  templateUrl: './luminosity-strip.component.html',
  styleUrls: ['./luminosity-strip.component.scss'],
  standalone: false,
})
export class BsLuminosityStripComponent implements AfterViewInit {
  constructor() {
    effect(() => {
      const hs = this.hsSignal();
      if (this.canvasContext) {
        const width = this.canvas.nativeElement.width, height = this.canvas.nativeElement.height;
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

    this.resultBackground = computed(() => {
      const hs = this.hsSignal();
      const luminosity = this.luminositySignal();
      return `hsl(${hs.hue}, ${hs.saturation * 100}%, ${luminosity * 100}%)`;
    });

    effect(() => {
      this.luminosityChange.emit(this.luminositySignal());
    });
  }

  //#region HS
  hsSignal = signal<HS>({ hue: 0, saturation: 0 });
  @Input() set hs(val: HS) {
    this.hsSignal.set(val);
  }
  //#endregion
  //#region Luminosity
  luminositySignal = signal<number>(0.5);
  @Input() set luminosity(val: number) {
    this.luminositySignal.set(val);
  }
  @Output() luminosityChange = new EventEmitter<number>();
  //#endregion

  private canvasContext: CanvasRenderingContext2D | null = null;
  @ViewChild('canvas') canvas!: ElementRef<HTMLCanvasElement>;
  ngAfterViewInit() {
    if (typeof window !== 'undefined') {
      this.canvasContext = this.canvas.nativeElement.getContext('2d', { willReadFrequently: true });
    }
  }

  resultBackground;
}
