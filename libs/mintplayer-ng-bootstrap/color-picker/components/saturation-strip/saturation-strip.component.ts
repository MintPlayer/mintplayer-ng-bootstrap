import { AfterViewInit, Component, ElementRef, EventEmitter, HostBinding, Input, OnDestroy, Output, ViewChild } from '@angular/core';
import { BehaviorSubject, Subject, takeUntil } from 'rxjs';
import { HS } from '../../interfaces/hs';

@Component({
  selector: 'bs-saturation-strip',
  templateUrl: './saturation-strip.component.html',
  styleUrls: ['./saturation-strip.component.scss']
})
export class BsSaturationStripComponent implements AfterViewInit, OnDestroy {
  constructor() {
    this.luminosity$.pipe(takeUntil(this.destroyed$))
      .subscribe((luminosity) => this.luminosityChange.emit(luminosity));

    this.hs$.pipe(takeUntil(this.destroyed$))
      .subscribe((hs) => {
        if (this.canvasContext) {
          const width = this.canvas.nativeElement.width, height = this.canvas.nativeElement.height;
          this.canvasContext.clearRect(0, 0, width, height);
          this.canvasContext.save();

          // HSL
          // - H: 0 - 359
          // - S: "0%" - "100%"
          // - L: "0%" - "100%"

          const gradient = this.canvasContext.createLinearGradient(0, 0, width, 0);
          // gradient.addColorStop(0, `hsl(${hs.hue}, 0%, ${hs.luminosity * 100}%)`);
          // gradient.addColorStop(1, `hsl(${hs.hue}, 100%, ${hs.luminosity * 100}%)`);
          gradient.addColorStop(0, `hsl(${hs.hue}, ${hs.saturation * 100}%, 0%)`);
          gradient.addColorStop(1, `hsl(${hs.hue}, ${hs.saturation * 100}%, 100%)`);
          this.canvasContext.fillStyle = gradient;
          this.canvasContext.fillRect(0, 0, width, height);
        }
      })
  }

  @HostBinding('class.d-block') dBlockClass = true;
  @ViewChild('canvas') canvas!: ElementRef<HTMLCanvasElement>;
  private canvasContext: CanvasRenderingContext2D | null = null;
  destroyed$ = new Subject();

  //#region HS
  hs$ = new BehaviorSubject<HS>({ hue: 0, saturation: 0 });
  public get hs() {
    return this.hs$.value;
  }
  @Input() public set hs(value: HS) {
    this.hs$.next(value);
  }
  //#endregion
  //#region Luminosity
  luminosity$ = new BehaviorSubject<number>(0);
  @Output() luminosityChange = new EventEmitter<number>();
  public get luminosity() {
    return this.luminosity$.value;
  }
  @Input() public set luminosity(value: number) {
    this.luminosity$.next(value);
  }
  //#endregion

  ngAfterViewInit() {
    this.canvasContext = this.canvas.nativeElement.getContext('2d', { willReadFrequently: true });
  }

  ngOnDestroy() {
    this.destroyed$.next(true);
  }
}
