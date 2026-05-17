import { Component, ChangeDetectionStrategy} from '@angular/core';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsGridColDirective } from '@mintplayer/ng-bootstrap/grid';
import { dedent } from 'ts-dedent';

@Component({
  selector: 'demo-grid',
  templateUrl: './grid.component.html',
  styleUrls: ['./grid.component.scss'],
  imports: [BsCodeSnippetComponent, BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsGridColDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GridComponent {
  protected readonly snippetBasicHtml = dedent`
    <bs-grid>
      <div bsRow>
        <div [md]="6">Left column</div>
        <div [md]="6">Right column</div>
      </div>
    </bs-grid>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component } from '@angular/core';
    import {
      BsGridComponent,
      BsGridRowDirective,
      BsGridColumnDirective,
    } from '@mintplayer/ng-bootstrap/grid';

    @Component({
      selector: 'my-grid-demo',
      templateUrl: './my-grid-demo.component.html',
      imports: [
        BsGridComponent,
        BsGridRowDirective,
        BsGridColumnDirective,
      ],
    })
    export class MyGridDemoComponent {}
  `;
}
