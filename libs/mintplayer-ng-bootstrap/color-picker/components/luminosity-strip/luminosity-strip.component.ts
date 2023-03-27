import { AfterViewInit, Component, ElementRef, EventEmitter, HostBinding, Input, OnDestroy, Output, ViewChild } from '@angular/core';
import { BehaviorSubject, Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'bs-luminosity-strip',
  templateUrl: './luminosity-strip.component.html',
  styleUrls: ['./luminosity-strip.component.scss']
})
export class BsLuminosityStripComponent implements AfterViewInit, OnDestroy {
  constructor() {
    this.luminosityChange.pipe(takeUntil(this.destroyed$))
      .subscribe((luminosity) => this.luminosityChange.emit(luminosity));
  }

  @HostBinding('class.d-block') dBlockClass = true;
  @ViewChild('canvas') canvas!: ElementRef<HTMLCanvasElement>;
  private canvasContext: CanvasRenderingContext2D | null = null;
  destroyed$ = new Subject();

  //#region Hue
  hue$ = new BehaviorSubject<number>(0);
  public get hue() {
    return this.hue$.value;
  }
  @Input() public set hue(value: number) {
    this.hue$.next(value);
  }
  //#endregion
  //#region Saturation
  saturation$ = new BehaviorSubject<number>(0);
  public get saturation() {
    return this.saturation$.value;
  }
  @Input() public set saturation(value: number) {
    this.saturation$.next(value);
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
    if (this.canvasContext) {
      const width = this.canvas.nativeElement.width, height = this.canvas.nativeElement.height;
      this.canvasContext.clearRect(0, 0, width, height);
      this.canvasContext.save();
      const gradient = this.canvasContext.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, '#FFFFFF');
      gradient.addColorStop(1, `hsl(${0}, 100%, 50%)`);
      this.canvasContext.fillStyle = gradient;
      this.canvasContext.fillRect(0, 0, width, height);
    }
  }

  ngOnDestroy() {
    this.destroyed$.next(true);
  }
}
