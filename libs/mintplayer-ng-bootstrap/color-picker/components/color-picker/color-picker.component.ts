import { Component, ElementRef, Input, ViewChild } from "@angular/core";
import { BehaviorSubject } from "rxjs";
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

  
  width$ = new BehaviorSubject<number>(150);
  height$ = new BehaviorSubject<number>(150);
}
