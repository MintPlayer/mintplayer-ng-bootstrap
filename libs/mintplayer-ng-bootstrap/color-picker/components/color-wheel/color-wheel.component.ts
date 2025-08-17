import { AfterViewInit, Component, DestroyRef, ElementRef, EventEmitter, HostBinding, HostListener, Input, Output, ViewChild } from '@angular/core';
import { BehaviorSubject, combineLatest, debounceTime, map, take, Observable, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HS } from '../../interfaces/hs';
import { HslColor } from '../../interfaces/hsl-color';
import { RgbColor } from '../../interfaces/rgb-color';

@Component({
  selector: 'bs-color-wheel',
  templateUrl: './color-wheel.component.html',
  styleUrls: ['./color-wheel.component.scss'],
  standalone: false,
})
export class BsColorWheelComponent implements AfterViewInit {

  constructor(private element: ElementRef<HTMLElement>, private destroy: DestroyRef) {
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
  
    combineLatest([this.innerRadius$, this.outerRadius$, this.shiftX$, this.shiftY$])
      .pipe(debounceTime(20), takeUntilDestroyed())
      .subscribe(([innerRadius, outerRadius, shiftX, shiftY]) => {
        if (this.canvasContext && (innerRadius !== null) && (outerRadius !== null) && (shiftX !== null) && (shiftY !== null)) {
          this.canvasContext.clearRect(0, 0, this.canvas.nativeElement.width, this.canvas.nativeElement.height);
          this.canvasContext.save();
          this.canvasContext.translate(shiftX + outerRadius, shiftY + outerRadius);

          for (let x = 0; x < 360; x++) {
            this.canvasContext.rotate(1 * Math.PI / 180);
            const gradient = this.canvasContext.createLinearGradient(innerRadius, 0, outerRadius, 0);

            gradient.addColorStop(0, `hsl(${x}, 0%, 50%)`);
            gradient.addColorStop(1, `hsl(${x}, 100%, 50%)`);

            this.canvasContext.fillStyle = gradient;
            this.canvasContext.fillRect(innerRadius, 0, outerRadius - innerRadius, outerRadius / 50);
          }

          this.canvasContext.restore();
        }
      });

    this.markerPosition$ = combineLatest([this.hs$, this.shiftX$, this.shiftY$])
      .pipe(switchMap(([hs, shiftX, shiftY]) => {
        return this.color2position(hs)
          .pipe(map((position) => ({position, shiftX: (shiftX ?? 0), shiftY: (shiftY ?? 0)})));
      }))
      .pipe(map(({position, shiftX, shiftY}) => {
        return {
          x: position.x + shiftX,
          y: position.y + shiftY,
        };
      }));

    this.hs$.pipe(takeUntilDestroyed())
      .subscribe((hs) => this.hsChange.emit(hs));
  }

  @HostBinding('class.position-relative') positionRelative = true;
  
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
  
  //#region Hue/Luminosity
  hs$ = new BehaviorSubject<HS>({ hue: 0, saturation: 0 });
  @Output() hsChange = new EventEmitter<HS>();
  public get hs() {
    return this.hs$.value;
  }
  @Input() public set hs(value: HS) {
    this.hs$.next(value);
  }
  //#endregion
  //#region Luminosity
  luminosity$ = new BehaviorSubject<number>(0);
  public get luminosity() {
    return this.luminosity$.value;
  }
  @Input() public set luminosity(value: number) {
    this.luminosity$.next(value);
  }
  //#endregion

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

  ngAfterViewInit() {
    // this.resizeObserver.observe(this.element.nativeElement);
    this.viewInited$.next(true);
    if (typeof window !== 'undefined') {
      this.canvasContext = this.canvas.nativeElement.getContext('2d', { willReadFrequently: true });
    }
  }

  onPointerDown(ev: MouseEvent | TouchEvent) {
    if (!this.disabled$.value) {
      ev.preventDefault();
      this.isPointerDown = true;
      this.updateColor(ev, !('touches' in ev));
    }
  }

  onPointerMove(ev: MouseEvent | TouchEvent) {
    if (this.isPointerDown) {
      ev.preventDefault();
      ev.stopPropagation();
      this.updateColor(ev, !('touches' in ev));
    }
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(ev: MouseEvent) {
    this.onPointerMove(ev);
  }

  @HostListener('document:mouseup', ['$event'])
  onPointerUp(ev: MouseEvent | TouchEvent) {
    this.isPointerDown = false;
  }

  private updateColor(ev: MouseEvent | TouchEvent, subtract: boolean) {
    let co: { x: number, y: number };
    const rect = this.canvas.nativeElement.getBoundingClientRect();
    if ('touches' in ev) {
      co = {
        x: ev.touches[0].clientX - rect.left,
        y: ev.touches[0].clientY - rect.top,
      };
    } else {
      co = {
        x: ev.clientX - (subtract ? rect.left : 0),
        y: ev.clientY - (subtract ? rect.top : 0),
      };
    }

    this.position2color(co.x, co.y).pipe(take(1), takeUntilDestroyed(this.destroy)).subscribe((color) => {
      if (color) {
        this.hs$.next({ hue: color.hue, saturation: color.saturation });
      } else {
        console.warn('Color is null');
      }
    });
  }

  private isInsideCircle(x: number, y: number) {
    return combineLatest([this.squareSize$, this.shiftX$, this.shiftY$])
      .pipe(map(([squareSize, shiftX, shiftY]) => {
        // Position to the square
        const sx: number = x - (shiftX ?? 0);
        const sy = y - (shiftY ?? 0);
        // Square radius
        const sr = (squareSize ?? 0) / 2;

        const radius = Math.sqrt(Math.pow(sx - sr, 2) + Math.pow(sy - sr, 2));
        const angle = (Math.atan2(sr - sy, sr - sx) + Math.PI) % 360;
        return {
          inside: radius <= sr,
          angle
        };
      }));
  }

  private position2color(x: number, y: number) {
    return this.isInsideCircle(x, y).pipe(map((result) => {
      if (!this.canvasContext) {
        return null;
      }

      if (result.inside) {
        const imageData = this.canvasContext.getImageData(x, y, 1, 1).data;
        const hsl = this.rgb2Hsl({ r: imageData[0], g: imageData[1], b: imageData[2] });
        return hsl;
      }

      return <HslColor>{ hue: result.angle * 180 / Math.PI, saturation: 1, luminosity: 0.5 };
    }));
  }

  private color2position(hs: HS) {
    return combineLatest([this.innerRadius$, this.outerRadius$])
      .pipe(map(([innerRadius, outerRadius]) => {
        if (innerRadius === null) {
          innerRadius = 0;
        }
        if (!outerRadius) {
          outerRadius = 100;
        }

        const theta = hs.hue * Math.PI / 180;
        const c = {
          x: -outerRadius * Math.cos(theta),
          y: -outerRadius * Math.sin(theta)
        };
    
        const d = hs.saturation * (outerRadius - innerRadius) + innerRadius;
        const o = { x: outerRadius, y: outerRadius };
    
        return {
          x: o.x - d * (c.x / outerRadius),
          y: o.y - d * (c.y / outerRadius),
        }
      }));
  }
  
  private rgb2Hsl(color: RgbColor) {
    const r01 = this.bound01(color.r, 255);
    const g01 = this.bound01(color.g, 255);
    const b01 = this.bound01(color.b, 255);

    const max = Math.max(r01, g01, b01);
    const min = Math.min(r01, g01, b01);

    let h: number, s: number; const l = (max + min) / 2;
    if (max === min) {
        h = s = 0;
    } else {
        const d = max - min;
        s = (l > 0.5) ? (d / (2 - max - min)) : (d / (max + min));
        switch (max) {
            case r01: {
                h = (g01 - b01) / d + ((g01 < b01) ? 6 : 0);
            } break;
            case g01: {
                h = (b01 - r01) / d + 2;
            } break;
            case b01: {
                h = (r01 - g01) / d + 4;
            } break;
            default: {
                throw 'Invalid operation';
            }
        }
        
        h /= 6;
    }
    
    h *= 360;

    return <HslColor>{ hue: h, saturation: s, luminosity: l };
  }

  /**
   * Divide 1 to n, handling floating point errors.
   * Ensures that the value is in between 0 and 1.
   **/
  private bound01(n: number, max: number) {
      n = Math.min(max, Math.max(0, n));
      if ((Math.abs(n - max) < 0.000001)) {
          return 1;
      } else {
          return (n % max) / max;
      }
  }

}
