import { DatePipe } from '@angular/common';
import { Component, model, ChangeDetectionStrategy} from '@angular/core';
import { BsFormComponent, BsFormControlDirective } from '@mintplayer/ng-bootstrap/form';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsTimepickerComponent } from '@mintplayer/ng-bootstrap/timepicker';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { dedent } from 'ts-dedent';

@Component({
  selector: 'demo-timepicker',
  templateUrl: './timepicker.component.html',
  styleUrls: ['./timepicker.component.scss'],
  imports: [BsCodeSnippetComponent, DatePipe, BsFormComponent, BsFormControlDirective, BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsTimepickerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimepickerComponent {
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
