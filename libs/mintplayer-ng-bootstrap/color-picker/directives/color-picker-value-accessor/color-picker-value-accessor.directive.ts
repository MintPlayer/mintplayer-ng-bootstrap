import { Directive, Inject, forwardRef, AfterViewInit, effect, untracked } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { BsColorPickerComponent } from '../../components/color-picker/color-picker.component';
import { RgbColor } from '../../interfaces/rgb-color';

@Directive({
  selector: 'bs-color-picker',
  standalone: false,
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => BsColorPickerValueAccessor),
    multi: true
  }],
  exportAs: 'bsColorPicker'
})
export class BsColorPickerValueAccessor implements AfterViewInit, ControlValueAccessor {

  constructor(@Inject(forwardRef(() => BsColorPickerComponent)) private host: BsColorPickerComponent) {
  }

  ngAfterViewInit() {
    effect(() => {
      const hs = this.host.hs();
      const luminosity = this.host.luminosity();
      untracked(() => {
        const rgb = this.hsl2rgb(hs.hue, hs.saturation, luminosity);
        const hex = this.rgb2hex(rgb);
        setTimeout(() => this.onValueChange && this.onValueChange(hex), 10);
      });
    });
  }

  public hsl2rgb(h: number, s: number, l: number) {
    const k = (n: number) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    const retValue = <RgbColor>{ r: 255 * f(0), g: 255 * f(8), b: 255 * f(4) };
    return retValue;
  }

  onValueChange?: (value: string) => void;
  onTouched?: () => void;

  //#region ControlValueAccessor implementation
  registerOnChange(fn: (_: any) => void) {
    this.onValueChange = fn;
  }

  registerOnTouched(fn: () => void) {
    this.onTouched = fn;
  }

  writeValue(value: string | null) {
    if (this.host && this.host.colorWheel) {
      if (value) {
        const rgb = this.hex2rgb(value);
        const hsl = this.rgb2Hsl(rgb);
        this.host.hs.set({ hue: hsl.h, saturation: hsl.s });
        this.host.luminosity.set(hsl.l);
      }
    }
  }

  setDisabledState(isDisabled: boolean) {
    if (this.host && this.host.colorWheel) {
      this.host.colorWheel.disabled.set(isDisabled);
    }
  }
  //#endregion

  //#region Color Conversion
  private rgb2hex(rgb: RgbColor) {
    return '#' + (Math.round((rgb.r << 16) + (rgb.g << 8) + rgb.b)).toString(16).padStart(6, '0');
  }

  private hex2rgb(hex: string): RgbColor {
    const r = parseInt(hex.slice(1, 3), 16),
          g = parseInt(hex.slice(3, 5), 16),
          b = parseInt(hex.slice(5, 7), 16);

    return { r, g, b };
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
  private rgb2Hsl(color: RgbColor) {
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
  //#endregion
}
