import { DatePipe, JsonPipe } from '@angular/common';
import { Component, model, ChangeDetectionStrategy, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { BsDatetimePickerComponent } from '@mintplayer/ng-bootstrap/datetime-picker';
import { dedent } from 'ts-dedent';
@Component({
  selector: 'demo-datetime-picker',
  templateUrl: './datetime-picker.component.html',
  styleUrls: ['./datetime-picker.component.scss'],
  imports: [DatePipe, JsonPipe, BsCodeSnippetComponent, BsDatetimePickerComponent, ReactiveFormsModule],
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

  protected readonly snippetBasicHtml = dedent`
    <bs-datetime-picker [(value)]="value" [showClear]="true"></bs-datetime-picker>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component, model } from '@angular/core';
    import { BsDatetimePickerComponent } from '@mintplayer/ng-bootstrap/datetime-picker';
    @Component({
      selector: 'my-datetime-picker-demo',
      templateUrl: './my-datetime-picker-demo.component.html',
      imports: [BsDatetimePickerComponent],
    })
    export class MyDatetimePickerDemoComponent {
      readonly value = model<Date | null>(null);
    }
  `;

  protected readonly snippetMinimalHtml = dedent`
    <bs-datetime-picker [(value)]="value" [showClear]="true"></bs-datetime-picker>
  `;

  protected readonly snippetReactiveHtml = dedent`
    <bs-datetime-picker [formControl]="reactive" [showClear]="true"></bs-datetime-picker>
  `;

  protected readonly snippetReactiveTs = dedent`
    import { Component } from '@angular/core';
    import { FormControl, ReactiveFormsModule } from '@angular/forms';
    import { BsDatetimePickerComponent } from '@mintplayer/ng-bootstrap/datetime-picker';
    @Component({
      selector: 'my-datetime-picker-demo',
      templateUrl: './my-datetime-picker-demo.component.html',
      imports: [ReactiveFormsModule, BsDatetimePickerComponent],
    })
    export class MyDatetimePickerDemoComponent {
      readonly reactive = new FormControl<Date | null>(null);
    }
  `;

  protected readonly snippetBoundsHtml = dedent`
    <bs-datetime-picker
      [(value)]="value"
      [min]="minDate"
      [max]="maxDate"
      [showClear]="true">
    </bs-datetime-picker>
    <!-- in component:
         readonly minDate = new Date(2026, 0, 1);
         readonly maxDate = new Date(2026, 11, 31); -->
  `;

  protected readonly snippetDisableFnHtml = dedent`
    <bs-datetime-picker
      [(value)]="value"
      [disableDateFn]="weekendsDisabled"
      [showClear]="true">
    </bs-datetime-picker>
  `;

  protected readonly snippetDisableFnTs = dedent`
    // Returning true means the date is unselectable.
    readonly weekendsDisabled = (d: Date) => {
      const day = d.getDay();
      return day === 0 || day === 6;
    };
  `;

  protected readonly snippetStepHtml = dedent`
    <!-- [step] is minutes between time slots — 30 ⇒ 00 & 30 only. -->
    <bs-datetime-picker
      [(value)]="value"
      [step]="30"
      [showClear]="true">
    </bs-datetime-picker>
  `;

  protected readonly snippetHour12Html = dedent`
    <!-- [hour12]: 'auto' = locale default; true = 12h; false = 24h. -->
    <bs-datetime-picker
      [(value)]="value"
      [hour12]="hour12Mode()"
      [showClear]="true">
    </bs-datetime-picker>
  `;
}
