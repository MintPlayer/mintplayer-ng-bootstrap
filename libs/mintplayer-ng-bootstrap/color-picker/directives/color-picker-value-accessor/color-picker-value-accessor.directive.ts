import { Directive, forwardRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { BsColorPickerComponent } from '../../components/color-picker/color-picker.component';
import { hex2hsv, hsv2rgb, rgb2hex } from '../../color-math';

@Directive({
  selector: 'bs-color-picker',
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => BsColorPickerValueAccessor),
    multi: true
  }],
  exportAs: 'bsColorPicker'
})
export class BsColorPickerValueAccessor implements ControlValueAccessor {
  private host = inject(BsColorPickerComponent);

  onValueChange?: (value: string) => void;
  onTouched?: () => void;

  constructor() {
    this.host.userChanged.pipe(takeUntilDestroyed()).subscribe(() => this.emit());
  }

  private emit() {
    if (!this.onValueChange) return;
    const hs = this.host.hs();
    const brightness = this.host.brightness();
    const rgb = hsv2rgb({ hue: hs.hue, saturation: hs.saturation, value: brightness });
    this.onValueChange(rgb2hex(rgb));
  }

  registerOnChange(fn: (_: any) => void) {
    this.onValueChange = fn;
  }

  registerOnTouched(fn: () => void) {
    this.onTouched = fn;
  }

  writeValue(value: string | null) {
    if (!value) return;
    const hsv = hex2hsv(value);
    this.host.hs.set({ hue: hsv.hue, saturation: hsv.saturation });
    this.host.brightness.set(hsv.value);
  }

  setDisabledState(isDisabled: boolean) {
    this.host.disabled.set(isDisabled);
  }
}
