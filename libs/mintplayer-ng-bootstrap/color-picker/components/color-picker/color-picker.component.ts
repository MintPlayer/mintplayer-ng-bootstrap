import { Component, ElementRef, Input, ViewChild } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import { HS } from "../../interfaces/hs";
import { BsColorWheelComponent } from "../color-wheel/color-wheel.component";

@Component({
  selector: 'bs-color-picker',
  templateUrl: './color-picker.component.html',
  styleUrls: ['./color-picker.component.scss']
})
export class BsColorPickerComponent {
  @ViewChild('wheel') colorWheel!: BsColorWheelComponent;
  @Input() set width(value: number) {
    this.width$.next(value);
  }
  @Input() set height(value: number) {
    this.height$.next(value);
  }
  @Input() set allowAlpha(value: boolean) {
    console.log('allowAlpha', value);
    this.allowAlpha$.next(value);
  }

  
  width$ = new BehaviorSubject<number>(150);
  height$ = new BehaviorSubject<number>(150);
  disabled$ = new BehaviorSubject<boolean>(false);
  allowAlpha$ = new BehaviorSubject<boolean>(true);

  //#region HS
  hs$ = new BehaviorSubject<HS>({ hue: 0, saturation: 0 });
  get hs() {
    return this.hs$.value;
  }
  @Input() set hs(value: HS) {
    this.hs$.next(value);
  }
  //#endregion
  //#region Luminosity
  luminosity$ = new BehaviorSubject<number>(0);
  get luminosity() {
    return this.luminosity$.value;
  }
  @Input() set luminosity(value: number) {
    this.luminosity$.next(value);
  }
  //#endregion
  //#region Alpha
  alpha$ = new BehaviorSubject<number>(1);
  get alpha() {
    return this.alpha$.value;
  }
  @Input() set alpha(value: number) {
    this.alpha$.next(value);
  }
  //#endregion

}
