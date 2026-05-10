import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import { HS } from '../../interfaces/hs';
import { BsSliderComponent, BsThumbDirective, BsTrackDirective } from '../slider/slider.component';

@Component({
  selector: 'bs-saturation-strip',
  templateUrl: './saturation-strip.component.html',
  styleUrls: ['./saturation-strip.component.scss'],
  imports: [BsSliderComponent, BsThumbDirective, BsTrackDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsSaturationStripComponent {
  disabled = input<boolean>(false);
  hs = model<HS>({ hue: 0, saturation: 0 });

  trackGradient = computed(() => {
    const hue = Math.round(this.hs().hue);
    return `linear-gradient(to right, hsl(${hue}, 0%, 50%), hsl(${hue}, 100%, 50%))`;
  });

  thumbBackground = computed(() => {
    const hue = Math.round(this.hs().hue);
    const sat = Math.round(this.hs().saturation * 100);
    return `hsl(${hue}, ${sat}%, 50%)`;
  });

  onValueChange(v: number) {
    this.hs.set({ ...this.hs(), saturation: v });
  }
}
