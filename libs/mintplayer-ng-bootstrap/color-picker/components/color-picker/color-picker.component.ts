import { Component, Input, ViewChild, EventEmitter, Output, signal, effect } from "@angular/core";
import { HS } from "../../interfaces/hs";
import { BsColorWheelComponent } from "../color-wheel/color-wheel.component";

@Component({
  selector: 'bs-color-picker',
  templateUrl: './color-picker.component.html',
  styleUrls: ['./color-picker.component.scss'],
  standalone: false,
})
export class BsColorPickerComponent {

  constructor() {
    effect(() => {
      this.alphaChange.emit(this.alpha());
    });
  }

  @ViewChild('wheel') colorWheel!: BsColorWheelComponent;

  size = signal<number>(150);
  @Input('size') set sizeInput(val: number) {
    this.size.set(val);
  }

  disabled = signal<boolean>(false);
  @Input('disabled') set disabledInput(val: boolean) {
    this.disabled.set(val);
  }

  allowAlpha = signal<boolean>(true);
  @Input('allowAlpha') set allowAlphaInput(val: boolean) {
    this.allowAlpha.set(val);
  }

  hs = signal<HS>({ hue: 0, saturation: 0 });
  luminosity = signal<number>(0);

  //#region Alpha
  alpha = signal<number>(1);
  @Input('alpha') set alphaInput(val: number) {
    this.alpha.set(val);
  }
  @Output() alphaChange = new EventEmitter<number>();
  //#endregion
}
