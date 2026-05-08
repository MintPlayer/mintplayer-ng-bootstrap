import { ChangeDetectionStrategy, Component, input, model, signal, viewChild } from "@angular/core";
import { Subject } from "rxjs";
import { HS } from "../../interfaces/hs";
import { BsColorPickerValueAccessor } from "../../directives/color-picker-value-accessor/color-picker-value-accessor.directive";
import { BsColorWheelComponent } from "../color-wheel/color-wheel.component";
import { BsBrightnessStripComponent } from "../brightness-strip/brightness-strip.component";
import { BsAlphaStripComponent } from "../alpha-strip/alpha-strip.component";

@Component({
  selector: 'bs-color-picker',
  templateUrl: './color-picker.component.html',
  styleUrls: ['./color-picker.component.scss'],
  imports: [BsColorWheelComponent, BsBrightnessStripComponent, BsAlphaStripComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [BsColorPickerValueAccessor],
})
export class BsColorPickerComponent {

  readonly colorWheel = viewChild.required<BsColorWheelComponent>('wheel');

  size = input<number>(150);
  disabled = signal<boolean>(false);
  allowAlpha = input<boolean>(true);

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
}
