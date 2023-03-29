import { Component, EventEmitter, Input, OnDestroy, Output } from "@angular/core";
import { BehaviorSubject, combineLatest, map, Observable, Subject, debounceTime, takeUntil } from 'rxjs';
import { HL } from "../../interfaces/hl";
import { RgbColor } from "../../interfaces/rgb-color";
import { HslService } from "../../services/hsl/hsl.service";

@Component({
  selector: 'bs-color-picker',
  templateUrl: './color-picker.component.html',
  styleUrls: ['./color-picker.component.scss']
})
export class BsColorPickerComponent implements OnDestroy {
  
  constructor(private hslService: HslService) {
    this.selectedColor$ = combineLatest([this.hl$, this.saturation$])
      .pipe(debounceTime(10), map(([hl, saturation]) => hslService.hsl2rgb(hl.hue, saturation, hl.luminosity)));

    this.selectedColor$.pipe(takeUntil(this.destroyed$))
      .subscribe(selectedColor => this.selectedColorChange.emit(selectedColor));
  }

  disabled$ = new BehaviorSubject<boolean>(false);
  destroyed$ = new Subject();

  //#region HL
  hl$ = new BehaviorSubject<HL>({ hue: 0, luminosity: 0 });
  get hl() {
    return this.hl$.value;
  }
  @Input() set hl(value: HL) {
    this.hl$.next(value);
  }
  //#endregion
  //#region Saturation
  saturation$ = new BehaviorSubject<number>(0);
  get saturation() {
    return this.saturation$.value;
  }
  @Input() set saturation(value: number) {
    this.saturation$.next(value);
  }
  //#endregion

  //#region SelectedColor
  selectedColor$: Observable<RgbColor>;
  @Output() selectedColorChange = new EventEmitter<RgbColor>();
  @Input() public set selectedColor(value: RgbColor) {
    const hsl = this.hslService.rgb2Hsl(value);
    this.hl$.next({ hue: hsl.h, luminosity: hsl.l });
    this.saturation$.next(hsl.l);
  }
  //#endregion

  ngOnDestroy() {
    this.destroyed$.next(true);
  }
}
