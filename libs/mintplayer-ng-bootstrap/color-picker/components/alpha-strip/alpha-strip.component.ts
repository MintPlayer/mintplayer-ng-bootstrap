import { AsyncPipe } from '@angular/common';
import { Component, EventEmitter, Input, Output, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { BehaviorSubject, combineLatest, map, Observable } from 'rxjs';
import { HS } from '../../interfaces/hs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BsSliderComponent } from '../slider/slider.component';

@Component({
  selector: 'bs-alpha-strip',
  templateUrl: './alpha-strip.component.html',
  styleUrls: ['./alpha-strip.component.scss'],
  imports: [AsyncPipe, BsSliderComponent],
})
export class BsAlphaStripComponent implements AfterViewInit {

  constructor() {
    combineLatest([this.hs$, this.luminosity$]).pipe(takeUntilDestroyed()).subscribe(([hs, luminosity]) => {
      setTimeout(() => {
        if (this.canvasContext) {
          const width = this.canvas.nativeElement.width, height = this.canvas.nativeElement.height;
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

    this.resultBackground$ = combineLatest([this.hs$, this.luminosity$, this.alpha$])
      .pipe(map(([hs, luminosity, alpha]) => {
        return `hsla(${hs.hue}, ${hs.saturation * 100}%, ${luminosity * 100}%, ${alpha})`;
      }));

    this.alpha$.pipe(takeUntilDestroyed())
      .subscribe((alpha) => this.alphaChange.emit(alpha));
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
  public get luminosity() {
    return this.luminosity$.value;
  }
  @Input() public set luminosity(value: number) {
    this.luminosity$.next(value);
  }
  //#endregion
  //#region Alpha
  alpha$ = new BehaviorSubject<number>(1);
  @Output() alphaChange = new EventEmitter<number>();
  public get alpha() {
    return this.alpha$.value;
  }
  @Input() public set alpha(value: number) {
    this.alpha$.next(value);
  }
  //#endregion
  
  private canvasContext: CanvasRenderingContext2D | null = null;
  @ViewChild('track') canvas!: ElementRef<HTMLCanvasElement>;
  ngAfterViewInit() {
    if (typeof window !== 'undefined') {
      this.canvasContext = this.canvas.nativeElement.getContext('2d', { willReadFrequently: true });
    }
  }

  resultBackground$: Observable<string>;
}
