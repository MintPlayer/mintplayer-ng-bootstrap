import { Component, model, ChangeDetectionStrategy} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { BsForDirective } from '@mintplayer/ng-bootstrap/for';
import { BsGridComponent, BsGridRowDirective, BsGridColDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsSelectComponent, BsSelectOption } from '@mintplayer/ng-bootstrap/select';
import { BsTabControlComponent, BsTabPageComponent, BsTabPageHeaderDirective, BsTabsPosition } from '@mintplayer/ng-bootstrap/tab-control';
import { dedent } from 'ts-dedent';

@Component({
  selector: 'demo-tab-control',
  templateUrl: './tab-control.component.html',
  styleUrls: ['./tab-control.component.scss'],
  imports: [FormsModule, BsCodeSnippetComponent, BsForDirective, BsGridComponent, BsGridRowDirective, BsGridColDirective, BsSelectComponent, BsSelectOption, BsTabControlComponent, BsTabPageComponent, BsTabPageHeaderDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TabControlComponent {
  tabsPosition = model<BsTabsPosition>('top');
  numbers = Array.from(Array(20).keys()).map(i => i + 1);

  protected readonly snippetBasicHtml = dedent`
    <bs-tab-control [border]="true">
      <bs-tab-page>
        <ng-container *bsTabPageHeader>Tab 1</ng-container>
        <div class="p-3">Content of the first tab.</div>
      </bs-tab-page>
      <bs-tab-page>
        <ng-container *bsTabPageHeader>Tab 2</ng-container>
        <div class="p-3">Content of the second tab.</div>
      </bs-tab-page>
    </bs-tab-control>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component } from '@angular/core';
    import {
      BsTabControlComponent,
      BsTabPageComponent,
      BsTabPageHeaderDirective,
    } from '@mintplayer/ng-bootstrap/tab-control';

    @Component({
      selector: 'my-tab-control-demo',
      templateUrl: './my-tab-control-demo.component.html',
      imports: [
        BsTabControlComponent,
        BsTabPageComponent,
        BsTabPageHeaderDirective,
      ],
    })
    export class MyTabControlDemoComponent {}
  `;
}
