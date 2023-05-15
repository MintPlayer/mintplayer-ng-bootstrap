import { Component, Input, ViewChild, EventEmitter, Output } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import { HS } from "../../interfaces/hs";
import { BsColorWheelComponent } from "../color-wheel/color-wheel.component";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";

@Component({
  selector: 'bs-color-picker',
  templateUrl: './color-picker.component.html',
  styleUrls: ['./color-picker.component.scss']
})
export class BsColorPickerComponent {

  constructor() {
    this.alpha$.pipe(takeUntilDestroyed())
      .subscribe((alpha) => this.alphaChange.emit(alpha));
  }

  @ViewChild('wheel') colorWheel!: BsColorWheelComponent;
  @Input() set width(value: number) {
    this.width$.next(value);
  }
  @Input() set height(value: number) {
    this.height$.next(value);
  }
  @Input() set allowAlpha(value: boolean) {
    this.allowAlpha$.next(value);
  }
  
  width$ = new BehaviorSubject<number>(150);
  height$ = new BehaviorSubject<number>(150);
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
