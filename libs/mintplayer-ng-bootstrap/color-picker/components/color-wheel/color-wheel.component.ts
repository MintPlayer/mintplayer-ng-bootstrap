import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, HostBinding, HostListener, inject, model, output, signal, ViewChild } from '@angular/core';
import { HS } from '../../interfaces/hs';
import { HslColor } from '../../interfaces/hsl-color';
import { RgbColor } from '../../interfaces/rgb-color';

@Component({
  selector: 'bs-color-wheel',
  templateUrl: './color-wheel.component.html',
  styleUrls: ['./color-wheel.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsColorWheelComponent {
  private element = inject(ElementRef<HTMLElement>);

  @HostBinding('class.position-relative') positionRelative = true;
  @ViewChild('canvas') canvas!: ElementRef<HTMLCanvasElement>;

  // Inputs
  width = model<number>(150);
  height = model<number>(150);
  diameterRatio = model<number>(0);
  luminosity = model<number>(0);

  // HS model with output
  hs = model<HS>({ hue: 0, saturation: 0 });
  hsChange = output<HS>();

  // Internal state
  disabled = signal<boolean>(false);
  viewInited = signal<boolean>(false);
  private isPointerDown = false;
  private canvasContext: CanvasRenderingContext2D | null = null;

  // Computed values
  squareSize = computed(() => {
    const width = this.width();
    const height = this.height();
    if (width === null || height === null) {
      return null;
    }
    return Math.min(width, height);
  });

  shiftX = computed(() => {
    const width = this.width();
    const height = this.height();
    if (width === null || height === null) {
      return null;
    } else if (width < height) {
      return 0;
    } else {
      return (width - height) / 2;
    }
  });

  shiftY = computed(() => {
    const width = this.width();
    const height = this.height();
    if (width === null || height === null) {
      return null;
    } else if (width < height) {
      return (height - width) / 2;
    } else {
      return 0;
    }
  });

  innerRadius = computed(() => {
    const squareSize = this.squareSize();
    const diameterRatio = this.diameterRatio();
    if (squareSize) {
      return squareSize / 2 * diameterRatio;
    } else {
      return 0;
    }
  });

  outerRadius = computed(() => {
    const squareSize = this.squareSize();
    if (squareSize) {
      return squareSize / 2;
    } else {
      return 150;
    }
  });

  markerPosition = computed(() => {
    const hs = this.hs();
    const shiftX = this.shiftX() ?? 0;
    const shiftY = this.shiftY() ?? 0;
    const position = this.color2position(hs);
    return {
      x: position.x + shiftX,
      y: position.y + shiftY,
    };
  });

  constructor() {
    // Draw color wheel when dimensions change
    effect(() => {
      const innerRadius = this.innerRadius();
      const outerRadius = this.outerRadius();
      const shiftX = this.shiftX();
      const shiftY = this.shiftY();

      // Use setTimeout to debounce slightly
      setTimeout(() => {
        if (this.canvasContext && innerRadius !== null && outerRadius !== null && shiftX !== null && shiftY !== null) {
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
      }, 20);
    });

    // Emit HS changes
    effect(() => {
      const hs = this.hs();
      this.hsChange.emit(hs);
    });
  }

  ngAfterViewInit() {
    this.viewInited.set(true);
    if (typeof window !== 'undefined') {
      this.canvasContext = this.canvas.nativeElement.getContext('2d', { willReadFrequently: true });
    }
  }

  onPointerDown(ev: MouseEvent | TouchEvent) {
    if (!this.disabled()) {
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

    const color = this.position2color(co.x, co.y);
    if (color) {
      this.hs.set({ hue: color.hue, saturation: color.saturation });
    } else {
      console.warn('Color is null');
    }
  }

  private isInsideCircle(x: number, y: number) {
    const squareSize = this.squareSize();
    const shiftX = this.shiftX();
    const shiftY = this.shiftY();

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
  }

  private position2color(x: number, y: number): HslColor | null {
    if (!this.canvasContext) {
      return null;
    }

    const result = this.isInsideCircle(x, y);
    if (result.inside) {
      const imageData = this.canvasContext.getImageData(x, y, 1, 1).data;
      const hsl = this.rgb2Hsl({ r: imageData[0], g: imageData[1], b: imageData[2] });
      return hsl;
    }

    return { hue: result.angle * 180 / Math.PI, saturation: 1, luminosity: 0.5 };
  }

  private color2position(hs: HS) {
    let innerRadius = this.innerRadius();
    let outerRadius = this.outerRadius();

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
    };
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
