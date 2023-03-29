import { Directive, Inject, forwardRef, OnDestroy, AfterViewInit } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { BsColorPickerComponent } from '../../components/color-picker/color-picker.component';
import { RgbColor } from '../../interfaces/rgb-color';

@Directive({
  selector: 'bs-color-picker',
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    // useExisting: BsColorPickerValueAccessor,
    useExisting: forwardRef(() => BsColorPickerValueAccessor),
    multi: true
  }],
  exportAs: 'bsColorPicker'
})
export class BsColorPickerValueAccessor implements AfterViewInit, OnDestroy, ControlValueAccessor {

  constructor(@Inject(forwardRef(() => BsColorPickerComponent)) private host: BsColorPickerComponent) {
  }

  ngAfterViewInit(): void {
    this.host.colorWheel.selectedColorChange
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
    if (this.host && this.host.colorWheel) {
      if (value) {
        this.host.colorWheel.selectedColor = this.hex2rgb(value);
      }
    }
  }

  setDisabledState(isDisabled: boolean) {
    if (this.host && this.host.colorWheel) {
      this.host.colorWheel.disabled$.next(isDisabled);
    }
  }
  //#endregion

  //#region Color Conversion
  private rgb2hex(rgb: RgbColor) {
    return '#' + ((rgb.r << 16) + (rgb.g << 8) + rgb.b).toString(16).padStart(6, '0');
  }

  private hex2rgb(hex: string): RgbColor {
    const r = parseInt(hex.slice(1, 3), 16),
          g = parseInt(hex.slice(3, 5), 16),
          b = parseInt(hex.slice(5, 7), 16);

    return { r, g, b };
  }
  //#endregion
}
