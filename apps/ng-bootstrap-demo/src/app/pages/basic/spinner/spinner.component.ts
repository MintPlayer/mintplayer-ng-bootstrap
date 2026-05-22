import { Component, ChangeDetectionStrategy } from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { EnumItem, EnumService } from '@mintplayer/ng-bootstrap/enum';
import { BsSpinnerComponent } from '@mintplayer/ng-bootstrap/spinner';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { dedent } from 'ts-dedent';
@Component({
  selector: 'demo-spinner',
  templateUrl: './spinner.component.html',
  styleUrls: ['./spinner.component.scss'],
  imports: [BsCodeSnippetComponent, BsSpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpinnerComponent {
  constructor(enumService: EnumService) {
    this.colors = enumService.getItems(Color);
  }

  colors: EnumItem[];

  protected readonly snippetBasicHtml = dedent`
    <bs-spinner [type]="'border'" [color]="colors.primary"></bs-spinner>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component } from '@angular/core';
    import { Color } from '@mintplayer/ng-bootstrap';
    import { BsSpinnerComponent } from '@mintplayer/ng-bootstrap/spinner';
    @Component({
      selector: 'my-spinner-demo',
      templateUrl: './my-spinner-demo.component.html',
      imports: [BsSpinnerComponent],
    })
    export class MySpinnerDemoComponent {
      protected readonly colors = Color;
    }
  `;

  protected readonly snippetBorderHtml = dedent`
    <!-- Classic spinning ring -->
    <bs-spinner [type]="'border'" [color]="colors.primary"></bs-spinner>
    <bs-spinner [type]="'border'" [color]="colors.success"></bs-spinner>
    <bs-spinner [type]="'border'" [color]="colors.danger"></bs-spinner>
  `;

  protected readonly snippetGrowHtml = dedent`
    <!-- Pulsing dot -->
    <bs-spinner [type]="'grow'" [color]="colors.primary"></bs-spinner>
    <bs-spinner [type]="'grow'" [color]="colors.success"></bs-spinner>
    <bs-spinner [type]="'grow'" [color]="colors.danger"></bs-spinner>
  `;
}
