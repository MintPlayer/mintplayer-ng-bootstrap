import { Directive, Inject, forwardRef, OnDestroy } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { BsColorWheelComponent } from '../../components/color-wheel/color-wheel.component';
import { RgbColor } from '../../interfaces/rgb-color';

@Directive({
  selector: 'bs-color-wheel',
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => BsColorWheelValueAccessor),
    multi: true
  }],
  exportAs: 'bsColorWheel'
})
export class BsColorWheelValueAccessor implements OnDestroy, ControlValueAccessor {

  constructor(@Inject(forwardRef(() => BsColorWheelComponent)) private host: BsColorWheelComponent) {

    this.host.selectedColorChange
      .pipe(takeUntil(this.destroyed$))
      .subscribe((selectedColor) => {
        this.onValueChange && this.onValueChange(selectedColor);
      });
  }

  destroyed$ = new Subject();
  onValueChange?: (value: RgbColor) => void;
  onTouched?: () => void;

  ngOnDestroy() {
    this.destroyed$.next(true);
  }

  //#region ControlValueAccessor implementation
  registerOnChange(fn: (_: any) => void) {
    this.onValueChange = fn;
  }
  
  registerOnTouched(fn: () => void) {
    this.onTouched = fn;
  }

  writeValue(value: RgbColor | null) {
    if (this.host) {
      if (value) {
        // this.host.selectedColor = this.hex2rgb(value);
        this.host.selectedColor = value;
      }
    }
  }

  setDisabledState(isDisabled: boolean) {
    if (this.host) {
      this.host.disabled$.next(isDisabled);
    }
  }
  //#endregion

  // //#region Color Conversion
  // private rgb2hex(rgb: RgbColor) {
  //   return '#' + ((rgb.r << 16) + (rgb.g << 8) + rgb.b).toString(16).padStart(6, '0');
  // }

  // private hex2rgb(hex: string): RgbColor {
  //   console.log('hex', hex);
  //   const r = parseInt(hex.slice(1, 3), 16),
  //         g = parseInt(hex.slice(3, 5), 16),
  //         b = parseInt(hex.slice(5, 7), 16);

  //   return { r, g, b };
  // }
  // //#endregion
}
