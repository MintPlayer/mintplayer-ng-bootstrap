import { Component, ChangeDetectionStrategy} from '@angular/core';
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
    <bs-spinner type="border" color="primary"></bs-spinner>
    <!-- Small, with your own status text for screen readers -->
    <bs-spinner [small]="true" label="Saving…"></bs-spinner>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component } from '@angular/core';
    import { BsSpinnerComponent } from '@mintplayer/ng-bootstrap/spinner';

    @Component({
      selector: 'my-spinner-demo',
      templateUrl: './my-spinner-demo.component.html',
      imports: [BsSpinnerComponent],
    })
    export class MySpinnerDemoComponent {}
  `;

  protected readonly snippetBorderHtml = dedent`
    <!-- Classic spinning ring -->
    <bs-spinner type="border" color="primary"></bs-spinner>
    <bs-spinner type="border" color="success"></bs-spinner>
    <bs-spinner type="border" color="danger"></bs-spinner>
  `;

  protected readonly snippetGrowHtml = dedent`
    <!-- Pulsing dot -->
    <bs-spinner type="grow" color="primary"></bs-spinner>
    <bs-spinner type="grow" color="success"></bs-spinner>
    <bs-spinner type="grow" color="danger"></bs-spinner>
  `;
}
