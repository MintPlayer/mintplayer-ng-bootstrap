import { ChangeDetectionStrategy, Component, effect, input, model, output, signal, viewChild } from "@angular/core";
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
  alphaChange = output<number>();

  constructor() {
    effect(() => {
      const alpha = this.alpha();
      this.alphaChange.emit(alpha);
    });
  }
}
