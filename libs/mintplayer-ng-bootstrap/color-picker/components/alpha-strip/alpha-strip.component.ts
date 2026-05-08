import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import { HS } from '../../interfaces/hs';
import { BsSliderComponent, BsThumbDirective, BsTrackDirective } from '../slider/slider.component';
import { hsv2rgb } from '../../color-math';

@Component({
  selector: 'bs-alpha-strip',
  templateUrl: './alpha-strip.component.html',
  styleUrls: ['./alpha-strip.component.scss'],
  imports: [BsSliderComponent, BsThumbDirective, BsTrackDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsAlphaStripComponent {
  disabled = input<boolean>(false);
  hs = model<HS>({ hue: 0, saturation: 0 });
  brightness = model<number>(1);
  alpha = model<number>(1);

  trackGradient = computed(() => {
    const hs = this.hs();
    const brightness = this.brightness();
    const rgb = hsv2rgb({ hue: hs.hue, saturation: hs.saturation, value: brightness });
    const r = Math.round(rgb.r), g = Math.round(rgb.g), b = Math.round(rgb.b);
    return `linear-gradient(to right, rgba(${r}, ${g}, ${b}, 0), rgba(${r}, ${g}, ${b}, 1))`;
  });

  resultBackground = computed(() => {
    const hs = this.hs();
    const brightness = this.brightness();
    const alpha = this.alpha();
    const rgb = hsv2rgb({ hue: hs.hue, saturation: hs.saturation, value: brightness });
    return `rgba(${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)}, ${alpha})`;
  });
}
