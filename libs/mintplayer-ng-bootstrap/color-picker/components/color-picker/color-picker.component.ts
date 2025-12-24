import { ChangeDetectionStrategy, Component, effect, input, model, output, signal, ViewChild } from "@angular/core";
import { HS } from "../../interfaces/hs";
import { BsColorWheelComponent } from "../color-wheel/color-wheel.component";

@Component({
  selector: 'bs-color-picker',
  templateUrl: './color-picker.component.html',
  styleUrls: ['./color-picker.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsColorPickerComponent {

  @ViewChild('wheel') colorWheel!: BsColorWheelComponent;

  size$ = input<number>(150);
  disabled$ = signal<boolean>(false);
  allowAlpha$ = input<boolean>(true);

  hs$ = signal<HS>({ hue: 0, saturation: 0 });
  luminosity$ = signal<number>(0);

  alpha$ = model<number>(1);
  alphaChange = output<number>();

  constructor() {
    effect(() => {
      const alpha = this.alpha$();
      this.alphaChange.emit(alpha);
    });
  }
}
