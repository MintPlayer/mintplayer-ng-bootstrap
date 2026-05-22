import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { BsCalendarComponent } from '@mintplayer/ng-bootstrap/calendar';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { dedent } from 'ts-dedent';
@Component({
  selector: 'demo-calendar',
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss'],
  imports: [BsCodeSnippetComponent, BsCalendarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarComponent {
  protected readonly selectedDate = signal(new Date());

  protected readonly snippetBasicHtml = dedent`
    <bs-calendar [(selectedDate)]="selectedDate"></bs-calendar>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component, signal } from '@angular/core';
    import { BsCalendarComponent } from '@mintplayer/ng-bootstrap/calendar';
    @Component({
      selector: 'my-calendar-demo',
      templateUrl: './my-calendar-demo.component.html',
      imports: [BsCalendarComponent],
    })
    export class MyCalendarDemoComponent {
      protected readonly selectedDate = signal(new Date());
    }
  `;
}
