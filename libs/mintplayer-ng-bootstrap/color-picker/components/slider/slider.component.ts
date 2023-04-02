import { AfterViewInit, Component, ElementRef, EventEmitter, HostBinding, HostListener, Input, OnDestroy, Output, ViewChild } from '@angular/core';
import { BehaviorSubject, combineLatest, map, Observable, Subject, takeUntil } from 'rxjs';
import { HS } from '../../interfaces/hs';

@Component({
  selector: 'bs-slider',
  templateUrl: './slider.component.html',
  styleUrls: ['./slider.component.scss']
})
export class BsSliderComponent implements AfterViewInit, OnDestroy {
  constructor(private element: ElementRef<HTMLElement>) {
    this.luminosity$.pipe(takeUntil(this.destroyed$))
      .subscribe((luminosity) => this.luminosityChange.emit(luminosity));
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
        // gradient.addColorStop(0, `hsl(${hs.hue}, ${hs.saturation * 100}%, 10%)`);
        gradient.addColorStop(0.5, `hsl(${hs.hue}, ${hs.saturation * 100}%, 50%)`);
        // gradient.addColorStop(1, `hsl(${hs.hue}, ${hs.saturation * 100}%, 90%)`);
        gradient.addColorStop(1, `hsl(${hs.hue}, ${hs.saturation * 100}%, 100%)`);
        this.canvasContext.fillStyle = gradient;
        this.canvasContext.fillRect(0, 0, width, height);
      }
    });

    this.resultBackground$ = combineLatest([this.hs$, this.luminosity$])
      .pipe(map(([hs, l]) => {
        return `hsl(${hs.hue}, ${hs.saturation * 100}%, ${l * 100}%)`;
      }));

    this.thumbMarginLeft$ = this.luminosity$.pipe(map((luminosity) => {
      const res = luminosity * element.nativeElement.clientWidth - 12;
      return res;
    }));
  }

  @ViewChild('canvas') canvas!: ElementRef<HTMLCanvasElement>;
  private canvasContext: CanvasRenderingContext2D | null = null;
  @HostBinding('class.d-block') dBlock = true;
  @HostBinding('style.height.px') height = 20;
  @HostBinding('class.position-relative') positionRelative = true;
  thumbMarginLeft$: Observable<number>;

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

  private isPointerDown = false;
  resultBackground$: Observable<string>;

  ngAfterViewInit() {
    this.canvasContext = this.canvas.nativeElement.getContext('2d', { willReadFrequently: true });
  }

  onPointerDown(ev: MouseEvent | TouchEvent) {
    ev.preventDefault();
    this.isPointerDown = true;
    this.updateColor(ev);
  }

  @HostListener('document:mousemove', ['$event'])
  onPointerMove(ev: MouseEvent | TouchEvent) {
    if (this.isPointerDown) {
      ev.preventDefault();
      ev.stopPropagation();
      this.updateColor(ev);
    }
  }

  @HostListener('document:mouseup', ['$event'])
  onPointerUp(ev: MouseEvent | TouchEvent) {
    this.isPointerDown = false;
  }

  private updateColor(ev: MouseEvent | TouchEvent) {
    let co: { x: number };
    const rect = this.canvas.nativeElement.getBoundingClientRect();
    if ('touches' in ev) {
      co = {
        x: ev.touches[0].clientX - rect.left,
      };
    } else {
      console.log('info', { rect: rect.left, ev: ev.clientX, w: this.canvas.nativeElement.width, el: this.element.nativeElement });
      co = {
        x: ev.clientX - rect.left,
      };
    }
    
    const percent = co.x / this.canvas.nativeElement.clientWidth;
    const limited = Math.max(0, Math.min(1, percent));
    console.log('percent', limited);
    this.luminosity$.next(limited);
  }

  destroyed$ = new Subject();
  ngOnDestroy() {
    this.destroyed$.next(true);
    this.destroyed$.complete();
  }
}
