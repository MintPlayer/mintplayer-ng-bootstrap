import { Directive, effect, forwardRef, inject } from '@angular/core';
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
    effect(() => {
      const hs = this.host.hs();
      const brightness = this.host.brightness();
      const rgb = hsv2rgb({ hue: hs.hue, saturation: hs.saturation, value: brightness });
      const hex = rgb2hex(rgb);
      setTimeout(() => this.onValueChange?.(hex), 10);
    });
  }

  registerOnChange(fn: (_: any) => void) {
    this.onValueChange = fn;
  }

  registerOnTouched(fn: () => void) {
    this.onTouched = fn;
  }

  writeValue(value: string | null) {
    if (!value || !this.host || !this.host.colorWheel()) return;
    const hsv = hex2hsv(value);
    this.host.hs.set({ hue: hsv.hue, saturation: hsv.saturation });
    this.host.brightness.set(hsv.value);
  }

  setDisabledState(isDisabled: boolean) {
    this.host.disabled.set(isDisabled);
  }
}
