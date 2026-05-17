import { Component, ChangeDetectionStrategy} from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsProgressComponent, BsProgressBarComponent } from '@mintplayer/ng-bootstrap/progress-bar';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { dedent } from 'ts-dedent';

@Component({
  selector: 'demo-progress-bar',
  templateUrl: './progress-bar.component.html',
  styleUrls: ['./progress-bar.component.scss'],
  imports: [BsCodeSnippetComponent, BsProgressComponent, BsProgressBarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProgressBarComponent {
  colors = Color;

  protected readonly snippetBasicHtml = dedent`
    <bs-progress>
      <bs-progress-bar [minimum]="0" [maximum]="100" [value]="50"></bs-progress-bar>
    </bs-progress>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component } from '@angular/core';
    import {
      BsProgressComponent,
      BsProgressBarComponent,
    } from '@mintplayer/ng-bootstrap/progress-bar';

    @Component({
      selector: 'my-progress-demo',
      templateUrl: './my-progress-demo.component.html',
      imports: [BsProgressComponent, BsProgressBarComponent],
    })
    export class MyProgressDemoComponent {}
  `;
}
