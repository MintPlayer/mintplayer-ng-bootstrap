import { DemoFormStateComponent } from '../../../../components/form-state/form-state.component';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective } from '@mintplayer/ng-bootstrap/grid';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { BsDatepickerComponent } from '@mintplayer/ng-bootstrap/datepicker';
import { dedent } from 'ts-dedent';

@Component({
  selector: 'demo-datepicker',
  templateUrl: './datepicker.component.html',
  styleUrls: ['./datepicker.component.scss'],
  imports: [FormsModule, ReactiveFormsModule, BsGridComponent, BsGridRowDirective, BsGridColumnDirective, DemoFormStateComponent, DatePipe, BsCodeSnippetComponent, BsDatepickerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatepickerComponent {
  /** Angular forms: the same control bound template-driven and reactive. */
  protected readonly formsValue = signal<Date | null>(new Date());
  protected readonly formsControl = new FormControl<Date | null>(new Date(), { nonNullable: true });
  protected readonly snippetFormsHtml = dedent`
    <!-- template-driven (FormsModule) -->
    <bs-datepicker [(ngModel)]="value"></bs-datepicker>

    <!-- reactive (ReactiveFormsModule): control = new FormControl(...) -->
    <bs-datepicker [formControl]="control"></bs-datepicker>
  `;


  protected readonly selectedDate = signal<Date | null>(new Date());
  disableDate = (date: Date) => {
    return date.getDate() % 2 === 0;
  }

  protected readonly snippetBasicHtml = dedent`
    <bs-datepicker [(selectedDate)]="selectedDate"></bs-datepicker>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component, signal } from '@angular/core';
    import { BsDatepickerComponent } from '@mintplayer/ng-bootstrap/datepicker';

    @Component({
      selector: 'my-datepicker-demo',
      templateUrl: './my-datepicker-demo.component.html',
      imports: [BsDatepickerComponent],
    })
    export class MyDatepickerDemoComponent {
      protected readonly selectedDate = signal(new Date());
    }
  `;
}
