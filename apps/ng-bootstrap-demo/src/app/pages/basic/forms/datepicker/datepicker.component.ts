import { DatePipe } from '@angular/common';
import { Component, model, ChangeDetectionStrategy} from '@angular/core';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { BsDatepickerComponent } from '@mintplayer/ng-bootstrap/datepicker';
import { dedent } from 'ts-dedent';

@Component({
  selector: 'demo-datepicker',
  templateUrl: './datepicker.component.html',
  styleUrls: ['./datepicker.component.scss'],
  imports: [DatePipe, BsCodeSnippetComponent, BsDatepickerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatepickerComponent {

  selectedDate = model(new Date());
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
