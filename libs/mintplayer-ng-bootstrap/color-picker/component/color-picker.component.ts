import { AfterViewInit, Component, ElementRef, EventEmitter, Host, HostBinding, HostListener, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { BehaviorSubject, combineLatest, debounce, debounceTime, filter, map, Observable, Subject, switchMap, takeUntil } from 'rxjs';
import { RgbColor } from '../interfaces/rgb-color';

@Component({
  selector: 'bs-color-picker',
  templateUrl: './color-picker.component.html',
  styleUrls: ['./color-picker.component.scss']
})
export class BsColorPickerComponent implements AfterViewInit, OnDestroy {

  constructor(private element: ElementRef<HTMLElement>) {
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

    combineLatest([this.width$, this.height$])
      .pipe(debounceTime(20), takeUntil(this.destroyed$))
      .subscribe(([width, height]) => {
        if ((width === null) || (height === null)) {
          this.squareSize$.next(null);
        } else {
          const squareSize = Math.min(width, height);
          this.squareSize$.next(squareSize);
          if (width < height) {
            this.shiftX$.next(0);
            this.shiftY$.next((height - width) / 2);
          } else {
            this.shiftX$.next((width - height) / 2);
            this.shiftY$.next(0);
          }
        }
      });
    
    combineLatest([this.squareSize$, this.diameterRatio$])
      .pipe(debounceTime(20), takeUntil(this.destroyed$))
      .subscribe(([squareSize, diameterRatio]) => {
        if (squareSize) {
          this.outerRadius$.next(squareSize / 2);
          this.innerRadius$.next(squareSize / 2 * diameterRatio);
        }
      });

    combineLatest([this.innerRadius$, this.outerRadius$, this.shiftX$, this.shiftY$])
      .pipe(takeUntil(this.destroyed$))
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

    this.markerPosition$ = combineLatest([this.selectedColor$, this.shiftX$, this.shiftY$])
      .pipe(switchMap(([selectedColor, shiftX, shiftY]) => {
        return this.color2position(selectedColor)
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

    this.selectedColor$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((selectedColor) => {
        this.selectedColorChange.emit(selectedColor);
      });
  }

  @HostBinding('class.position-relative') positionRelative = true;
  
  //#region selectedColor
  private selectedColor$ = new BehaviorSubject<RgbColor>({ r: 255, g: 255, b: 255 });
  @Output() public selectedColorChange = new EventEmitter<RgbColor>();
  @Input() public set selectedColor(value: RgbColor) {
    this.selectedColor$.next(value);
  }
  public get selectedColor() {
    return this.selectedColor$.value;
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

  squareSize$ = new BehaviorSubject<number | null>(null);
  shiftX$ = new BehaviorSubject<number | null>(null);
  shiftY$ = new BehaviorSubject<number | null>(null);

  innerRadius$ = new BehaviorSubject<number | null>(null);
  outerRadius$ = new BehaviorSubject<number | null>(null);
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
      this.selectedColor$.next(color);
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

  private color2position(color: RgbColor) {
    return combineLatest([this.innerRadius$, this.outerRadius$])
      .pipe(map(([innerRadius, outerRadius]) => {
        if (innerRadius === null) {
          innerRadius = 0;
        }
        if (!outerRadius) {
          outerRadius = 100;
        }

        const { h, s, l } = this.rgb2Hsl(color);
        const theta = h * Math.PI / 180;
        const c = {
          x: outerRadius * Math.cos(theta),
          y: outerRadius * Math.sin(theta)
        };
        const ratio = 1 - Math.max(0, 2 * (l - 0.5));
    
        const d = ratio * (outerRadius - innerRadius) + innerRadius;
        const o = { x: outerRadius, y: outerRadius };
    
        return {
          x: o.x + d * (c.x / outerRadius),
          y: o.y + d * (c.y / outerRadius),
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

    return { h, s, l };
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
