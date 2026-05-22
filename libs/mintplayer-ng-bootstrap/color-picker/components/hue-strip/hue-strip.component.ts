import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import { HS } from '../../interfaces/hs';
import { BsSliderComponent, BsThumbDirective, BsTrackDirective } from '../slider/slider.component';
/**
 * Hue picker — a horizontal rainbow strip backed by `bs-slider`. Two-way
 * `[(hs)]` keeps the saturation untouched; only `hs.hue` (0–360°) changes.
 * Inherits the slider's APG keyboard model (Arrow keys, Home/End, PageUp/Down).
 */
@Component({
  selector: 'bs-hue-strip',
  templateUrl: './hue-strip.component.html',
  styleUrls: ['./hue-strip.component.scss'],
  imports: [BsSliderComponent, BsThumbDirective, BsTrackDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsHueStripComponent {
  disabled = input<boolean>(false);
  hs = model<HS>({ hue: 0, saturation: 0 });

  /** Hue normalized to 0..1 for the underlying bs-slider (which works in 0..1). */
  normalizedHue = computed(() => this.hs().hue / 360);

  /** Rainbow gradient — every hue at full saturation/lightness. */
  readonly trackGradient =
    'linear-gradient(to right,' +
    ' hsl(0, 100%, 50%),' +
    ' hsl(60, 100%, 50%),' +
    ' hsl(120, 100%, 50%),' +
    ' hsl(180, 100%, 50%),' +
    ' hsl(240, 100%, 50%),' +
    ' hsl(300, 100%, 50%),' +
    ' hsl(360, 100%, 50%))';

  thumbBackground = computed(() => `hsl(${Math.round(this.hs().hue)}, 100%, 50%)`);

  onValueChange(v: number) {
    this.hs.set({ ...this.hs(), hue: v * 360 });
  }
}
