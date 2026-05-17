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
}
