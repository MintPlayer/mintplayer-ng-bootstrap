import { ChangeDetectionStrategy, Component, inject, input, model, signal, viewChild } from "@angular/core";
import { Subject } from "rxjs";
import { BsIdService } from "@mintplayer/ng-bootstrap/a11y";
import { HS } from "../../interfaces/hs";
import { BsColorPickerValueAccessor } from "../../directives/color-picker-value-accessor/color-picker-value-accessor.directive";
import { BsColorWheelComponent } from "../color-wheel/color-wheel.component";
import { BsBrightnessStripComponent } from "../brightness-strip/brightness-strip.component";
import { BsAlphaStripComponent } from "../alpha-strip/alpha-strip.component";
import { BsHueStripComponent } from "../hue-strip/hue-strip.component";
import { BsSaturationStripComponent } from "../saturation-strip/saturation-strip.component";

@Component({
  selector: 'bs-color-picker',
  templateUrl: './color-picker.component.html',
  styleUrls: ['./color-picker.component.scss'],
  imports: [
    BsColorWheelComponent,
    BsBrightnessStripComponent,
    BsAlphaStripComponent,
    BsHueStripComponent,
    BsSaturationStripComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [BsColorPickerValueAccessor],
})
export class BsColorPickerComponent {
  private ids = inject(BsIdService);

  readonly colorWheel = viewChild.required<BsColorWheelComponent>('wheel');

  size = input<number>(150);
  disabled = signal<boolean>(false);
  allowAlpha = input<boolean>(true);

  /**
   * When true (default), a "Show hue + saturation sliders" checkbox is rendered
   * below the picker. Toggling it reveals dedicated 1-D sliders for hue and
   * saturation alongside the existing brightness/alpha strips, giving keyboard
   * and screen-reader users a 1-D path for every channel without having to
   * spatialise the 2-D wheel. Set to false to hide both the checkbox and the
   * channel sliders entirely (e.g. when the consuming app provides its own
   * accessibility settings UI).
   */
  showAccessibilityToggle = input<boolean>(true);

  /** Whether the channel sliders (hue + saturation) are currently visible. Driven by the toggle checkbox. */
  channelSlidersVisible = signal<boolean>(false);

  readonly toggleId = this.ids.next('bs-color-picker-toggle');

  hs = signal<HS>({ hue: 0, saturation: 0 });
  brightness = signal<number>(1);

  alpha = model<number>(1);

  /**
   * Fires when the user drives a change (drags the wheel or the brightness strip).
   * The value accessor subscribes to this so it only emits to the form on real
   * user actions — not on writeValue echoes or initial signal-default state.
   */
  readonly userChanged = new Subject<void>();

  onUserHsChange(hs: HS) {
    this.hs.set(hs);
    this.userChanged.next();
  }

  onUserBrightnessChange(brightness: number) {
    this.brightness.set(brightness);
    this.userChanged.next();
  }

  onUserAlphaChange(alpha: number) {
    this.alpha.set(alpha);
    this.userChanged.next();
  }

  onChannelSlidersToggle(event: Event) {
    this.channelSlidersVisible.set((event.target as HTMLInputElement).checked);
  }
}
