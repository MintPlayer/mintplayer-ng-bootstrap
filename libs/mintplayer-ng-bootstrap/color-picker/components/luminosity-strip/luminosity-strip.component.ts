import { Component, EventEmitter, Input, Output, AfterViewInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { BehaviorSubject, combineLatest, map, Observable, Subject, takeUntil } from 'rxjs';
import { HS } from '../../interfaces/hs';

@Component({
  selector: 'bs-luminosity-strip',
  templateUrl: './luminosity-strip.component.html',
  styleUrls: ['./luminosity-strip.component.scss']
})
export class BsLuminosityStripComponent implements AfterViewInit, OnDestroy {
  constructor() {
    this.hs$.pipe(takeUntil(this.destroyed$)).subscribe((hs) => {
      if (this.canvasContext) {
        const width = this.canvas.nativeElement.width, height = this.canvas.nativeElement.height;
        this.canvasContext.clearRect(0, 0, width, height);
        this.canvasContext.save();

        // HSL
        // - H: 0 - 359
        // - S: "0%" - "100%"
        // - L: "0%" - "50%" - "100%"

        const gradient = this.canvasContext.createLinearGradient(0, 0, width, 0);
        gradient.addColorStop(0, `hsl(${hs.hue}, ${hs.saturation * 100}%, 0%)`);
        gradient.addColorStop(0.5, `hsl(${hs.hue}, ${hs.saturation * 100}%, 50%)`);
        gradient.addColorStop(1, `hsl(${hs.hue}, ${hs.saturation * 100}%, 100%)`);
        this.canvasContext.fillStyle = gradient;
        this.canvasContext.fillRect(0, 0, width, height);
      }
    });
    
    this.resultBackground$ = combineLatest([this.hs$, this.luminosity$])
      .pipe(map(([hs, luminosity]) => {
        return `hsl(${hs.hue}, ${hs.saturation * 100}%, ${luminosity * 100}%)`;
      }));
      
    this.luminosity$.pipe(takeUntil(this.destroyed$))
      .subscribe((luminosity) => this.luminosityChange.emit(luminosity));
  }

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
  luminosity$ = new BehaviorSubject<number>(0.5);
  @Output() luminosityChange = new EventEmitter<number>();
  public get luminosity() {
    return this.luminosity$.value;
  }
  @Input() public set luminosity(value: number) {
    this.luminosity$.next(value);
  }
  //#endregion

  private canvasContext: CanvasRenderingContext2D | null = null;
  @ViewChild('canvas') canvas!: ElementRef<HTMLCanvasElement>;
  ngAfterViewInit() {
    this.canvasContext = this.canvas.nativeElement.getContext('2d', { willReadFrequently: true });
  }

  resultBackground$: Observable<string>;

  destroyed$ = new Subject();
  ngOnDestroy() {
    this.destroyed$.next(true);
  }
}
