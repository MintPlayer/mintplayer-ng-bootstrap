import { Component, EventEmitter, Input, OnDestroy, Output } from "@angular/core";
import { BehaviorSubject, combineLatest, map, Observable, Subject, debounceTime, takeUntil } from 'rxjs';
import { HS } from "../../interfaces/hs";
import { RgbColor } from "../../interfaces/rgb-color";
import { HslService } from "../../services/hsl/hsl.service";

@Component({
  selector: 'bs-color-picker',
  templateUrl: './color-picker.component.html',
  styleUrls: ['./color-picker.component.scss']
})
export class BsColorPickerComponent implements OnDestroy {
  
  constructor(private hslService: HslService) {
    this.selectedColor$ = combineLatest([this.hs$, this.luminosity$])
      .pipe(debounceTime(10), map(([hs, luminosity]) => hslService.hsl2rgb(hs.hue, hs.saturation, luminosity)));

    this.selectedColor$.pipe(takeUntil(this.destroyed$))
      .subscribe(selectedColor => this.selectedColorChange.emit(selectedColor));
  }

  disabled$ = new BehaviorSubject<boolean>(false);
  destroyed$ = new Subject();

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

  //#region SelectedColor
  selectedColor$: Observable<RgbColor>;
  @Output() selectedColorChange = new EventEmitter<RgbColor>();
  @Input() public set selectedColor(value: RgbColor) {
    const hsl = this.hslService.rgb2Hsl(value);
    this.hs$.next({ hue: hsl.h, saturation: hsl.s });
    this.luminosity$.next(hsl.l);
  }
  //#endregion

  ngOnDestroy() {
    this.destroyed$.next(true);
  }
}
