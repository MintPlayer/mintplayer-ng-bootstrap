import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsTooltipDirective } from '@mintplayer/ng-bootstrap/tooltip';
import { GIT_REPO } from '../../../providers/git-repo.provider';
import { dedent } from 'ts-dedent';
@Component({
  selector: 'demo-tooltip',
  templateUrl: './tooltip.component.html',
  styleUrls: ['./tooltip.component.scss'],
  imports: [BsCodeSnippetComponent, BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsTooltipDirective, BsButtonTypeDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TooltipComponent {
  gitRepo = inject(GIT_REPO);
  colors = Color;

  protected readonly snippetBasicHtml = dedent`
    <button [color]="colors.primary">
      Hover me
      <div *bsTooltip="'top'">
        Hello <b>world</b>
      </div>
    </button>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component } from '@angular/core';
    import { Color } from '@mintplayer/ng-bootstrap';
    import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
    import { BsTooltipDirective } from '@mintplayer/ng-bootstrap/tooltip';
    @Component({
      selector: 'my-tooltip-demo',
      templateUrl: './my-tooltip-demo.component.html',
      imports: [BsTooltipDirective, BsButtonTypeDirective],
    })
    export class MyTooltipDemoComponent {
      protected readonly colors = Color;
    }
  `;
}
