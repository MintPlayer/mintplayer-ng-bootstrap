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

  protected readonly snippetFlexHtml = dedent`
    <!-- [col] auto-fits — columns share width equally inside the row. -->
    <bs-grid>
      <div bsRow>
        <div [col]>Hello</div>
        <div [col]>World</div>
      </div>
    </bs-grid>
  `;

  protected readonly snippetExplicitHtml = dedent`
    <!-- [sm]="N" sets the column span at the small breakpoint and up. -->
    <bs-grid>
      <div bsRow>
        <div [sm]="8">Hello</div>
        <div [sm]="4">World</div>
      </div>
    </bs-grid>
  `;

  protected readonly snippetMinimumHtml = dedent`
    <!-- [xxs]="N" sets the column span from the smallest breakpoint upward. -->
    <bs-grid>
      <div bsRow>
        <div [xxs]="8">Hello</div>
        <div [xxs]="4">World</div>
      </div>
    </bs-grid>
  `;
}
