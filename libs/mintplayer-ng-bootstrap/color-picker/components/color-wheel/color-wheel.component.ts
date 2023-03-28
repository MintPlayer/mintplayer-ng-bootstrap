import { Component, ElementRef, EventEmitter, Input, Output, HostBinding, HostListener, ViewChild } from '@angular/core';
import { BehaviorSubject, combineLatest, debounceTime, map, Observable, Subject, switchMap, takeUntil } from 'rxjs';
import { HL } from '../../interfaces/hl';
import { RgbColor } from '../../interfaces/rgb-color';
import { HslService } from '../../services/hsl/hsl.service';

@Component({
  selector: 'bs-color-wheel',
  templateUrl: './color-wheel.component.html',
  styleUrls: ['./color-wheel.component.scss']
})
export class BsColorWheelComponent {

  constructor(private element: ElementRef<HTMLElement>, private hslService: HslService) {
    // this.resizeObserver = new ResizeObserver((entries) => {
    //   for (const entry of entries) {
    //     if (entry.target === this.element.nativeElement) {
    //       console.log(entry.contentRect);
    //       this.width$.next(entry.contentRect.width);
    //       this.height$.next(entry.contentRect.height);
    //       break;
    //     }
    //   }
    // });

    this.squareSize$ = combineLatest([this.width$, this.height$])
      .pipe(map(([width, height]) => {
        if ((width === null) || (height === null)) {
          return null;
        }

        const squareSize = Math.min(width, height);
        return squareSize;
      }));

    this.shiftX$ = combineLatest([this.width$, this.height$])
      .pipe(map(([width, height]) => {
        if ((width === null) || (height === null)) {
          return null;
        } else if (width < height) {
          return 0;
        } else {
          return (width - height) / 2;
        }
      }));

    this.shiftY$ = combineLatest([this.width$, this.height$])
      .pipe(map(([width, height]) => {
        if ((width === null) || (height === null)) {
          return null;
        } else if (width < height) {
          return (height - width) / 2;
        } else {
          return 0;
        }
      }));

    this.innerRadius$ = combineLatest([this.squareSize$, this.diameterRatio$])
      .pipe(map(([squareSize, diameterRatio]) => {
        if (squareSize) {
          return squareSize / 2 * diameterRatio;
        } else {
          return 0;
        }
      }));

    this.outerRadius$ = combineLatest([this.squareSize$, this.diameterRatio$])
      .pipe(map(([squareSize, diameterRatio]) => {
        if (squareSize) {
          return squareSize / 2;
        } else {
          return 150;
        }
      }));
  
    this.hl$.pipe(takeUntil(this.destroyed$))
      .subscribe(hl => this.hlChange.emit(hl));

    combineLatest([this.innerRadius$, this.outerRadius$, this.shiftX$, this.shiftY$])
      .pipe(debounceTime(20), takeUntil(this.destroyed$))
      .subscribe(([innerRadius, outerRadius, shiftX, shiftY]) => {
        if (this.canvasContext && (innerRadius !== null) && (outerRadius !== null) && (shiftX !== null) && (shiftY !== null)) {
          this.canvasContext.clearRect(0, 0, this.canvas.nativeElement.width, this.canvas.nativeElement.height);
          this.canvasContext.save();
          this.canvasContext.translate(shiftX + outerRadius, shiftY + outerRadius);

          for (let x = 0; x < 360; x++) {
            this.canvasContext.rotate(1 * Math.PI / 180);
            const gradient = this.canvasContext.createLinearGradient(innerRadius, 0, outerRadius, 0);
            gradient.addColorStop(0, '#FFFFFF');
            gradient.addColorStop(1, `hsl(${x}, 100%, 50%)`);
            this.canvasContext.fillStyle = gradient;
            this.canvasContext.fillRect(innerRadius, 0, outerRadius - innerRadius, outerRadius / 50);
          }

          this.canvasContext.restore();
        }
      });

    this.markerPosition$ = combineLatest([this.hl$, this.shiftX$, this.shiftY$])
      .pipe(switchMap(([hl, shiftX, shiftY]) => {
        return this.color2position(hl)
          .pipe(map((position) => <[{x:number,y:number}, number, number]>[position, shiftX, shiftY]));
      }))
      .pipe(map(([position, shiftX, shiftY]) => {
        if ((shiftX !== null) && (shiftY !== null) && position) {
          return {
            x: position.x + shiftX,
            y: position.y + shiftY,
          };
        } else {
          return position;
        }
      }));

    // this.selectedColor$
    //   .pipe(takeUntil(this.destroyed$))
    //   .subscribe((selectedColor) => {
    //     this.selectedColorChange.emit(selectedColor);
    //   });
  }

  @HostBinding('class.d-block')
  @HostBinding('class.position-relative') positionRelative = true;
  
  // //#region selectedColor
  // private selectedColor$ = new BehaviorSubject<RgbColor>({ r: 255, g: 255, b: 255 });
  // @Output() public selectedColorChange = new EventEmitter<RgbColor>();
  // @Input() public set selectedColor(value: RgbColor) {
  //   this.selectedColor$.next(value);
  // }
  // public get selectedColor() {
  //   return this.selectedColor$.value;
  // }
  // //#endregion

  //#region Hue/Luminosity
  hl$ = new BehaviorSubject<HL>({ hue: 0, luminosity: 0 });
  @Output() hlChange = new EventEmitter<HL>();
  public get hl() {
    return this.hl$.value;
  }
  @Input() public set hl(value: HL) {
    this.hl$.next(value);
  }
  //#endregion
  //#region Saturation
  saturation$ = new BehaviorSubject<number>(0);
  // @Output() saturationChange = new EventEmitter<number>();
  public get saturation() {
    return this.saturation$.value;
  }
  @Input() public set saturation(value: number) {
    this.saturation$.next(value);
  }
  //#endregion

  @Input() set diameterRatio(value: number) {
    this.diameterRatio$.next(value);
  }
  @Input() set width(value: number) {
    this.width$.next(value);
  }
  @Input() set height(value: number) {
    this.height$.next(value);
  }
  @ViewChild('canvas') canvas!: ElementRef<HTMLCanvasElement>;
  
  // private resizeObserver: ResizeObserver;
  private canvasContext: CanvasRenderingContext2D | null = null;
  private isPointerDown = false;
  width$ = new BehaviorSubject<number>(150);
  height$ = new BehaviorSubject<number>(150);
  diameterRatio$ = new BehaviorSubject<number>(0);

  squareSize$: Observable<number | null>;
  shiftX$: Observable<number | null>;
  shiftY$: Observable<number | null>;

  innerRadius$: Observable<number | null>;
  outerRadius$: Observable<number | null>;
  markerPosition$: Observable<{x: number, y: number}>;
  disabled$ = new BehaviorSubject<boolean>(false);
  
  viewInited$ = new BehaviorSubject<boolean>(false);
  destroyed$ = new Subject();

  ngAfterViewInit() {
    // this.resizeObserver.observe(this.element.nativeElement);
    this.viewInited$.next(true);
    this.canvasContext = this.canvas.nativeElement.getContext('2d', { willReadFrequently: true });
  }

  ngOnDestroy() {
    // this.resizeObserver.unobserve(this.element.nativeElement);
    this.destroyed$.next(true);
  }

  onPointerDown(ev: MouseEvent | TouchEvent) {
    if (!this.disabled$.value) {
      ev.preventDefault();
      this.isPointerDown = true;
      this.updateColor(ev);
    }
  }

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
    let co: { x: number, y: number };
    if ('touches' in ev) {
      const rect = this.canvas.nativeElement.getBoundingClientRect();
      co = {
        x: ev.touches[0].clientX - rect.left,
        y: ev.touches[0].clientY - rect.top,
      };
    } else {
      co = {
        x: ev.offsetX,
        y: ev.offsetY,
      };
    }
    
    const color = this.position2color(co.x, co.y);
    if (color) {
      const hsl = this.hslService.rgb2Hsl(color);
      // this.selectedColor$.next(color);
      this.hl$.next({ hue: hsl.h, luminosity: hsl.l });
    } else {
      console.warn('Color is null');
    }
  }

  private position2color(x: number, y: number) {
    if (this.canvasContext) {
      const imageData = this.canvasContext.getImageData(x, y, 1, 1).data;
      return <RgbColor>{ r: imageData[0], g: imageData[1], b: imageData[2] };
    } else {
      return null;
    }
  }

  private color2position(hl: HL) {
    return combineLatest([this.innerRadius$, this.outerRadius$])
      .pipe(map(([innerRadius, outerRadius]) => {
        if (innerRadius === null) {
          innerRadius = 0;
        }
        if (!outerRadius) {
          outerRadius = 100;
        }

        const theta = hl.hue * Math.PI / 180;
        const c = {
          x: outerRadius * Math.cos(theta),
          y: outerRadius * Math.sin(theta)
        };
        const ratio = 1 - Math.max(0, 2 * (hl.luminosity - 0.5));
    
        const d = ratio * (outerRadius - innerRadius) + innerRadius;
        const o = { x: outerRadius, y: outerRadius };
    
        return {
          x: o.x + d * (c.x / outerRadius),
          y: o.y + d * (c.y / outerRadius),
        }
      }));
  }
}
