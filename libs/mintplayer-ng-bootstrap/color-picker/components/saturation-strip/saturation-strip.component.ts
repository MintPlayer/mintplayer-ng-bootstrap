import { AfterViewInit, Component, ElementRef, EventEmitter, HostBinding, Input, OnDestroy, Output, ViewChild } from '@angular/core';
import { BehaviorSubject, Subject, takeUntil } from 'rxjs';
import { HL } from '../../interfaces/hl';

@Component({
  selector: 'bs-saturation-strip',
  templateUrl: './saturation-strip.component.html',
  styleUrls: ['./saturation-strip.component.scss']
})
export class BsSaturationStripComponent implements AfterViewInit, OnDestroy {
  constructor() {
    this.saturation$.pipe(takeUntil(this.destroyed$))
      .subscribe((saturation) => this.saturationChange.emit(saturation));
  }

  @HostBinding('class.d-block') dBlockClass = true;
  @ViewChild('canvas') canvas!: ElementRef<HTMLCanvasElement>;
  private canvasContext: CanvasRenderingContext2D | null = null;
  destroyed$ = new Subject();

  //#region HL
  hl$ = new BehaviorSubject<HL>(0);
  public get hl() {
    return this.hl$.value;
  }
  @Input() public set hl(value: HL) {
    this.hl$.next(value);
  }
  //#endregion
  //#region Saturation
  saturation$ = new BehaviorSubject<number>(0);
  @Output() saturationChange = new EventEmitter<number>();
  public get saturation() {
    return this.saturation$.value;
  }
  @Input() public set saturation(value: number) {
    this.saturation$.next(value);
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
