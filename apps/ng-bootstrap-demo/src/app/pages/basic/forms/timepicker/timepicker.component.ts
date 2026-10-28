import { DemoFormStateComponent } from '../../../../components/form-state/form-state.component';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { Component, model, ChangeDetectionStrategy, signal } from '@angular/core';
import { BsFormComponent, BsFormControlDirective } from '@mintplayer/ng-bootstrap/form';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsTimepickerComponent } from '@mintplayer/ng-bootstrap/timepicker';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { dedent } from 'ts-dedent';

@Component({
  selector: 'demo-timepicker',
  templateUrl: './timepicker.component.html',
  styleUrls: ['./timepicker.component.scss'],
  imports: [FormsModule, ReactiveFormsModule, DemoFormStateComponent, BsCodeSnippetComponent, DatePipe, BsFormComponent, BsFormControlDirective, BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsTimepickerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimepickerComponent {
  /** Angular forms: the same control bound template-driven and reactive. */
  protected readonly formsValue = signal<Date | null>(new Date());
  protected readonly formsControl = new FormControl<Date | null>(new Date(), { nonNullable: true });
  protected readonly snippetFormsHtml = dedent`
    <!-- template-driven (FormsModule) -->
    <bs-timepicker [(ngModel)]="value"></bs-timepicker>

    <!-- reactive (ReactiveFormsModule): control = new FormControl(...) -->
    <bs-timepicker [formControl]="control"></bs-timepicker>
  `;

  selectedTime = model(new Date());

  protected readonly snippetBasicHtml = dedent`
    <bs-timepicker [(selectedTime)]="selectedTime"></bs-timepicker>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component, model } from '@angular/core';
    import { BsTimepickerComponent } from '@mintplayer/ng-bootstrap/timepicker';

    @Component({
      selector: 'my-timepicker-demo',
      templateUrl: './my-timepicker-demo.component.html',
      imports: [BsTimepickerComponent],
    })
    export class MyTimepickerDemoComponent {
      protected readonly selectedTime = model(new Date());
    }
  `;
}
