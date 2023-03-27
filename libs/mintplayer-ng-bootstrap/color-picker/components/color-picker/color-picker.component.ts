import { Component, EventEmitter, Input, OnDestroy, Output } from "@angular/core";
import { BehaviorSubject, Subject, takeUntil } from 'rxjs';
import { HL } from "../../interfaces/hl";
import { RgbColor } from "../../interfaces/rgb-color";

@Component({
  selector: 'bs-color-picker',
  templateUrl: './color-picker.component.html',
  styleUrls: ['./color-picker.component.scss']
})
export class BsColorPickerComponent implements OnDestroy {
  
  constructor() {
    // this.selectedColor$
    //   .pipe(takeUntil(this.destroyed$))
    //   .subscribe((selectedColor) => {
    //     this.selectedColorChange.emit(selectedColor);
    //   });
  }

  // //#region selectedColor
  // selectedColor$ = new BehaviorSubject<RgbColor>({ r: 255, g: 255, b: 255 });
  // @Output() public selectedColorChange = new EventEmitter<RgbColor>();
  // @Input() public set selectedColor(value: RgbColor) {
  //   this.selectedColor$.next(value);
  // }
  // public get selectedColor() {
  //   return this.selectedColor$.value;
  // }
  // //#endregion

  hl$ = new BehaviorSubject<HL>({ hue: 0, luminosity: 0 });
  saturation = new BehaviorSubject<number>(0);
  
  disabled$ = new BehaviorSubject<boolean>(false);
  destroyed$ = new Subject();

  // onSelectedColorChange(ev: HL) {
  //   this.selectedColor$.next(ev);
  // }

  ngOnDestroy() {
    this.destroyed$.next(true);
  }
}
