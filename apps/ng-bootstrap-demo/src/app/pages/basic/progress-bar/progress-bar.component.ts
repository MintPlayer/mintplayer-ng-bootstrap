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

  protected readonly snippetSimpleHtml = dedent`
    <bs-progress>
      <bs-progress-bar [minimum]="0" [maximum]="100" [value]="15"></bs-progress-bar>
    </bs-progress>
  `;

  protected readonly snippetStripedHtml = dedent`
    <bs-progress>
      <bs-progress-bar
        [minimum]="0" [maximum]="100" [value]="30"
        [color]="colors.warning"
        [striped]="true">
      </bs-progress-bar>
    </bs-progress>
  `;

  protected readonly snippetAnimatedHtml = dedent`
    <bs-progress>
      <bs-progress-bar
        [minimum]="0" [maximum]="100" [value]="20"
        [color]="colors.info"
        [striped]="true"
        [animated]="true">
      </bs-progress-bar>
    </bs-progress>
  `;

  protected readonly snippetStackedHtml = dedent`
    <!-- Multiple <bs-progress-bar> children render side-by-side. -->
    <bs-progress>
      <bs-progress-bar [minimum]="0" [maximum]="100" [value]="15"></bs-progress-bar>
      <bs-progress-bar [minimum]="0" [maximum]="100" [value]="30" [color]="colors.warning" [striped]="true"></bs-progress-bar>
      <bs-progress-bar [minimum]="0" [maximum]="100" [value]="20" [color]="colors.info"></bs-progress-bar>
    </bs-progress>
  `;

  protected readonly snippetInfiniteHtml = dedent`
    <!-- [isIndeterminate]="true" enables the marching-stripes loading look. -->
    <bs-progress [isIndeterminate]="true">
      <bs-progress-bar [minimum]="0" [maximum]="100" [value]="15"></bs-progress-bar>
      <bs-progress-bar [minimum]="0" [maximum]="100" [value]="30" [color]="colors.warning" [striped]="true"></bs-progress-bar>
      <bs-progress-bar [minimum]="0" [maximum]="100" [value]="20" [color]="colors.info" [striped]="true" [animated]="true"></bs-progress-bar>
    </bs-progress>
  `;
}
