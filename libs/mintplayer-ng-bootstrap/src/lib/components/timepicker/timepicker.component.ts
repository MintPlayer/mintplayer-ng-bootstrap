import { ChangeDetectorRef, Component, EventEmitter, Input, NgZone, Output, Renderer2 } from '@angular/core';

@Component({
  selector: 'bs-timepicker',
  templateUrl: './timepicker.component.html',
  styleUrls: ['./timepicker.component.scss']
})
export class BsTimepickerComponent {

  constructor(private ref: ChangeDetectorRef, private zone: NgZone, private renderer: Renderer2) {
    const today = new Date();
    today.setHours(0); today.setMinutes(0); today.setSeconds(0);

    const interval = 900;
    this.presetTimestamps = Array.from(Array(24 * 60 * 60 / interval).keys())
      .map(i => {
        const clone = new Date(today);
        clone.setTime(clone.getTime() + i * interval * 1000);
        return clone;
      });
  }

  isOpen = false;
  presetTimestamps: Date[] = [];
  isFocused = false;

  selectAll(box: HTMLInputElement) {
    box.select();
    // box.setSelectionRange(0, box.value.length);
    this.isFocused = true;
  }

  setNumber(event: Event, max: number, nextInput: HTMLInputElement | null) {
    event.preventDefault();
    const input = <HTMLInputElement>event.target;
    const val = parseInt(input.value);
    if (isNaN(val)) {
      input.value = '00';
    } else {
      const result = Math.min(max, Math.abs(val));
      input.value = result.toString().padStart(2, '0');

      if (nextInput) {
        // const maxAllowedNumberOfDigits = input.max.length;
        if (result * 10 > parseInt(input.max)) {
          nextInput.focus();
        }
      }
    }
  }

  setTime(time: Date) {
    this.selectedTime = time;
    this.isOpen = false;
  }

  //#region SelectedTime
  private _selectedTime = new Date();
  @Output() public selectedTimeChange = new EventEmitter<Date>();
  public get selectedTime() {
    return this._selectedTime;
  }
  @Input() public set selectedTime(value: Date) {
    // this.hours = value.getHours();
    // this.minutes = value.getMinutes();
    this._selectedTime = value;
    this.selectedTimeChange.emit(this._selectedTime);
  }
  //#endregion

  //#region Hours
  // private _hours = 0;
  get hours() {
    // return this._hours;
    return this.selectedTime.getHours();
  }
  set hours(value: number) {
    // this._hours = value;
    const clone = new Date(this.selectedTime);
    clone.setHours(value);
    this.selectedTime = clone;
  }
  // hours = 0;
  //#endregion
  //#region Minutes
  // private _minutes = 0;
  get minutes() {
    // return this._minutes;
    return this.selectedTime.getMinutes();
  }
  set minutes(value: number) {
    // this._minutes = value;
    // this.selectedTime.setMinutes(value);
    const clone = new Date(this.selectedTime);
    clone.setMinutes(value);
    this.selectedTime = clone;
  }
  //#endregion

  timesEqual(time1: Date, time2: Date) {
    return (time1.getHours() === time2.getHours()) && (time1.getMinutes() === time2.getMinutes());
  }

}
