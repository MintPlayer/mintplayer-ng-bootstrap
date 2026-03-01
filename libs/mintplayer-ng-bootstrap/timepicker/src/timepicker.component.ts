/// <reference types="./types" />

import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, inject, model, signal, ChangeDetectionStrategy} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsDropdownDirective, BsDropdownMenuDirective } from '@mintplayer/ng-bootstrap/dropdown';
import { BsDropdownMenuComponent, BsDropdownItemComponent } from '@mintplayer/ng-bootstrap/dropdown-menu';
import { EnhancedPasteDirective } from '@mintplayer/ng-bootstrap/enhanced-paste';
import { BsFormComponent } from '@mintplayer/ng-bootstrap/form';
import { BsHasOverlayComponent } from '@mintplayer/ng-bootstrap/has-overlay';
import { BsInputGroupComponent } from '@mintplayer/ng-bootstrap/input-group';

@Component({
  selector: 'bs-timepicker',
  templateUrl: './timepicker.component.html',
  styleUrls: ['./timepicker.component.scss'],
  imports: [DatePipe, DecimalPipe, FormsModule, EnhancedPasteDirective, BsFormComponent, BsDropdownDirective, BsDropdownMenuDirective, BsDropdownMenuComponent, BsDropdownItemComponent, BsInputGroupComponent, BsButtonTypeDirective, BsHasOverlayComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsTimepickerComponent {
  private sanitizer = inject(DomSanitizer);

  constructor() {
    const today = new Date();
    today.setHours(0); today.setMinutes(0); today.setSeconds(0);

    const interval = 900;
    this.presetTimestamps = Array.from(Array(24 * 60 * 60 / interval).keys())
      .map(i => {
        const clone = new Date(today);
        clone.setTime(clone.getTime() + i * interval * 1000);
        return clone;
      });


    import('bootstrap-icons/icons/clock.svg').then((icon) => {
      this.clock.set(this.sanitizer.bypassSecurityTrustHtml(icon.default));
    });
  }

  clock = signal<SafeHtml | undefined>(undefined);
  colors = Color;
  isOpen = model(false);
  presetTimestamps: Date[] = [];
  isFocused = signal(false);

  selectAll(box: HTMLInputElement) {
    box.select();
    // box.setSelectionRange(0, box.value.length);
    this.isFocused.set(true);
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
    this.selectedTime.set(time);
    this.isOpen.set(false);
  }

  selectedTime = model<Date>(new Date());

  //#region Hours
  get hours() {
    return this.selectedTime().getHours();
  }
  set hours(value: number) {
    const clone = new Date(this.selectedTime());
    clone.setHours(value);
    this.selectedTime.set(clone);
  }
  //#endregion

  //#region Minutes
  get minutes() {
    return this.selectedTime().getMinutes();
  }
  set minutes(value: number) {
    const clone = new Date(this.selectedTime());
    clone.setMinutes(value);
    this.selectedTime.set(clone);
  }
  //#endregion

  timesEqual(time1: Date, time2: Date) {
    return (time1.getHours() === time2.getHours()) && (time1.getMinutes() === time2.getMinutes());
  }

}
