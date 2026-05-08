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

  // The hex most recently observed (either written by the form or emitted to it).
  // Lets the emit effect dedup the echo from writeValue, breaking the round-trip loop.
  private lastHex: string | null = null;

  constructor() {
    effect(() => {
      const hs = this.host.hs();
      const brightness = this.host.brightness();
      const rgb = hsv2rgb({ hue: hs.hue, saturation: hs.saturation, value: brightness });
      const hex = rgb2hex(rgb);
      if (hex === this.lastHex) return;
      this.lastHex = hex;
      this.onValueChange?.(hex);
    });
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
    this.lastHex = rgb2hex(hsv2rgb(hsv));
    this.host.hs.set({ hue: hsv.hue, saturation: hsv.saturation });
    this.host.brightness.set(hsv.value);
  }

  setDisabledState(isDisabled: boolean) {
    this.host.disabled.set(isDisabled);
  }
}
