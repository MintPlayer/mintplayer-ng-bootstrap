import { Component, ChangeDetectionStrategy} from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsPopoverDirective } from '@mintplayer/ng-bootstrap/popover';
import { dedent } from 'ts-dedent';

@Component({
  selector: 'demo-popover',
  templateUrl: './popover.component.html',
  styleUrls: ['./popover.component.scss'],
  imports: [BsCodeSnippetComponent, BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsPopoverDirective, BsButtonTypeDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PopoverComponent {
  colors = Color;

  protected readonly snippetBasicHtml = dedent`
    <button [color]="colors.primary">
      Click me
      <ng-container *bsPopover="'top'; title: 'Popover title'">
        Place any content here — text, links, embedded components.
      </ng-container>
    </button>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component } from '@angular/core';
    import { Color } from '@mintplayer/ng-bootstrap';
    import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
    import { BsPopoverDirective } from '@mintplayer/ng-bootstrap/popover';

    @Component({
      selector: 'my-popover-demo',
      templateUrl: './my-popover-demo.component.html',
      imports: [BsPopoverDirective, BsButtonTypeDirective],
    })
    export class MyPopoverDemoComponent {
      protected readonly colors = Color;
    }
  `;
}
