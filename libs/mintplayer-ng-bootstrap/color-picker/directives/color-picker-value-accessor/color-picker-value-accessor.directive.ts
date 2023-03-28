import { Directive, Inject, forwardRef, OnDestroy } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { BsColorPickerComponent } from '../../components/color-picker/color-picker.component';
import { RgbColor } from '../../interfaces/rgb-color';

@Directive({
  selector: 'bs-color-picker',
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => BsColorPickerValueAccessor),
    multi: true
  }],
  exportAs: 'bsColorPicker'
})
export class BsColorPickerValueAccessor implements OnDestroy, ControlValueAccessor {

  constructor(@Inject(forwardRef(() => BsColorPickerComponent)) private host: BsColorPickerComponent) {
    this.host.selectedColorChange
      .pipe(takeUntil(this.destroyed$))
      .subscribe((selectedColor) => {
        const hex = this.rgb2hex(selectedColor);
        this.onValueChange && this.onValueChange(hex);
      });
  }

  destroyed$ = new Subject();
  onValueChange?: (value: string) => void;
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

  writeValue(value: string | null) {
    if (this.host) {
      if (value) {
        this.host.selectedColor = this.hex2rgb(value);
      }
    }
  }

  setDisabledState(isDisabled: boolean) {
    if (this.host) {
      this.host.disabled$.next(isDisabled);
    }
  }
  //#endregion

  //#region Color Conversion
  private rgb2hex(rgb: RgbColor) {
    return '#' + ((Math.round(rgb.r) << 16) + (Math.round(rgb.g) << 8) + Math.round(rgb.b)).toString(16).padStart(6, '0');
  }

  private hex2rgb(hex: string): RgbColor {
    const r = parseInt(hex.slice(1, 3), 16),
          g = parseInt(hex.slice(3, 5), 16),
          b = parseInt(hex.slice(5, 7), 16);

    return { r, g, b };
  }
  //#endregion
}
