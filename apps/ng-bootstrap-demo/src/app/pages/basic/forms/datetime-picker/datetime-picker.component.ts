import { DatePipe, JsonPipe } from '@angular/common';
import { Component, model, ChangeDetectionStrategy, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { BsDatetimePickerComponent } from '@mintplayer/ng-bootstrap/datetime-picker';

@Component({
  selector: 'demo-datetime-picker',
  templateUrl: './datetime-picker.component.html',
  styleUrls: ['./datetime-picker.component.scss'],
  imports: [DatePipe, JsonPipe, BsDatetimePickerComponent, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatetimePickerComponent {
  readonly minimal = model<Date | null>(null);

  readonly reactive = new FormControl<Date | null>(null);

  readonly boundsValue = model<Date | null>(null);
  readonly boundsMin = new Date(2026, 0, 1);
  readonly boundsMax = new Date(2026, 11, 31);

  readonly weekendsValue = model<Date | null>(null);
  readonly weekendsDisabled = (d: Date) => {
    const day = d.getDay();
    return day === 0 || day === 6;
  };

  readonly stepValue = model<Date | null>(null);

  readonly hour12Value = model<Date | null>(null);
  readonly hour12Mode = signal<'auto' | true | false>('auto');
  setHour12Mode(mode: 'auto' | 'on' | 'off'): void {
    this.hour12Mode.set(mode === 'on' ? true : mode === 'off' ? false : 'auto');
  }
}
