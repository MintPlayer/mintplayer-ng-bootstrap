import { Component, Input, ViewChild, EventEmitter, Output } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import { HS } from "../../interfaces/hs";
import { BsColorWheelComponent } from "../color-wheel/color-wheel.component";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { BsLuminosityStripComponent } from "../luminosity-strip/luminosity-strip.component";
import { BsAlphaStripComponent } from "../alpha-strip/alpha-strip.component";
import { AsyncPipe } from "@angular/common";
import { BsColorPickerValueAccessor } from "../../directives/color-picker-value-accessor/color-picker-value-accessor.directive";

@Component({
  selector: 'bs-color-picker',
  templateUrl: './color-picker.component.html',
  styleUrls: ['./color-picker.component.scss'],
  imports: [AsyncPipe, BsColorWheelComponent, BsLuminosityStripComponent, BsAlphaStripComponent],
  providers: [BsColorPickerValueAccessor]
})
export class BsColorPickerComponent {

  constructor() {
    this.alpha$.pipe(takeUntilDestroyed())
      .subscribe((alpha) => this.alphaChange.emit(alpha));
  }

  @ViewChild('wheel') colorWheel!: BsColorWheelComponent;
  @Input() set size(value: number) {
    this.size$.next(value);
  }
  @Input() set allowAlpha(value: boolean) {
    this.allowAlpha$.next(value);
  }
  
  size$ = new BehaviorSubject<number>(150);
  disabled$ = new BehaviorSubject<boolean>(false);
  allowAlpha$ = new BehaviorSubject<boolean>(true);

  hs$ = new BehaviorSubject<HS>({ hue: 0, saturation: 0 });
  luminosity$ = new BehaviorSubject<number>(0);

  //#region Alpha
  alpha$ = new BehaviorSubject<number>(1);
  @Output() alphaChange = new EventEmitter<number>();
  get alpha() {
    return this.alpha$.value;
  }
  @Input() set alpha(value: number) {
    this.alpha$.next(value);
  }
  //#endregion
}
