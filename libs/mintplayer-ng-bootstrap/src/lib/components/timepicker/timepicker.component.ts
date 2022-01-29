import { ChangeDetectorRef, Component, NgZone, OnChanges, Renderer2, SimpleChanges } from '@angular/core';
import { NgModel } from '@angular/forms';

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
      input.value = '0';
    } else {
      const result = Math.min(max, Math.abs(val));
      input.value = result.toString();

      if (nextInput) {
        // const maxAllowedNumberOfDigits = input.max.length;
        if (result * 10 > parseInt(input.max)) {
          nextInput.focus();
        }
      }
    }
  }

  // filterInput(value: any, max: number) {
  //   const val = parseInt(value);
  //   if (isNaN(val)) {
  //     return 0;
  //   } else {
  //     return Math.min(max, Math.abs(val));
  //   }
  // }

  // onPaste(event: ClipboardEvent, max: number) {
  //   // event.preventDefault();
  //   const data = event.clipboardData || (<any>window).clipboardData;
  //   const contents = data.getData('text');
  //   const filtered = this.filterInput(contents, max);
  //   // this.zone.run(() => {
  //   //   (<any>event.target).value = filtered;
  //   //   this.ref.detectChanges();
  //   // });
  //   // if (max == 59) {
  //   //   this.minutes = filtered;
  //   // } else {
  //   //   this.hours = filtered;
  //   // }
  //   // setTimeout(() => {
  //   //   (<any>event.target).value = filtered;
  //   // }, 2000);
  //   this.renderer.setValue(event.target, filtered.toString());
  //   this.model.valueAccessor?.writeValue(filtered.toString());
  // }

  // ngOnChanges(changes: SimpleChanges): void {
  //   console.log('changes', changes);
  // }

  //#region Hours
  private _hours = 0;
  get hours() {
    return this._hours;
  }
  set hours(value: number) {
    this._hours = value;
  }
  // hours = 0;
  //#endregion
  //#region Minutes
  private _minutes = 0;
  get minutes() {
    return this._minutes;
  }
  set minutes(value: number) {
    this._minutes = value;
  }
  //#endregion

}
