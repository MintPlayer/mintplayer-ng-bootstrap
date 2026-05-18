import { Component, ChangeDetectionStrategy} from '@angular/core';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { BsResizableComponent } from '@mintplayer/ng-bootstrap/resizable';
import { dedent } from 'ts-dedent';

@Component({
  selector: 'demo-resizable',
  templateUrl: './resizable.component.html',
  styleUrls: ['./resizable.component.scss'],
  imports: [BsCodeSnippetComponent, BsResizableComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResizableComponent {
  protected readonly snippetBasicHtml = dedent`
    <bs-resizable>
      <div class="p-2 h-100">
        Drag the handle on the edges to resize this panel.
      </div>
    </bs-resizable>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component } from '@angular/core';
    import { BsResizableComponent } from '@mintplayer/ng-bootstrap/resizable';

    @Component({
      selector: 'my-resizable-demo',
      templateUrl: './my-resizable-demo.component.html',
      imports: [BsResizableComponent],
    })
    export class MyResizableDemoComponent {}
  `;

  protected readonly snippetInlineHtml = dedent`
    <!-- Default: the wrapper grows inline with surrounding content. -->
    <bs-resizable>
      <div class="p-2 h-100">Drag any edge to resize.</div>
    </bs-resizable>
  `;

  protected readonly snippetAbsoluteHtml = dedent`
    <!-- [positioning]="'absolute'" — wrapper is positioned inside a
         positioned ancestor; useful for floating / overlay layouts. -->
    <bs-resizable [positioning]="'absolute'">
      <div class="p-2 h-100">Drag any edge to resize.</div>
    </bs-resizable>
  `;
}
