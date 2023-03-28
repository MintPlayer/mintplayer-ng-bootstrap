import { Injectable } from '@angular/core';
import { RgbColor } from '../../interfaces/rgb-color';

@Injectable()
export class HslService {
  public rgb2Hsl(color: RgbColor) {
    const r01 = this.bound01(color.r, 255);
    const g01 = this.bound01(color.g, 255);
    const b01 = this.bound01(color.b, 255);

    const max = Math.max(r01, g01, b01);
    const min = Math.min(r01, g01, b01);

    let h: number, s: number;
    const l = (max + min) / 2;
    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case r01:
          h = (g01 - b01) / d + (g01 < b01 ? 6 : 0);
          break;
        case g01:
          h = (b01 - r01) / d + 2;
          break;
        case b01:
          h = (r01 - g01) / d + 4;
          break;
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
    if (Math.abs(n - max) < 0.000001) {
      return 1;
    } else {
      return (n % max) / max;
    }
  }

  public hsl2rgb(h: number, s: number, l: number) {
    // s /= 100;
    // l /= 100;
    const k = (n: number) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    const retValue = <RgbColor>{ r: 255 * f(0), g: 255 * f(8), b: 255 * f(4) };
    return retValue;
  }
}
