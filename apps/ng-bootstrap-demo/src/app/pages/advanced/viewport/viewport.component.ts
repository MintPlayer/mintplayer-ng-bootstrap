import { Component, ChangeDetectionStrategy} from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsAlertComponent } from '@mintplayer/ng-bootstrap/alert';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { BsInViewportDirective } from '@mintplayer/ng-bootstrap/viewport';
import { dedent } from 'ts-dedent';

@Component({
  selector: 'demo-viewport',
  templateUrl: './viewport.component.html',
  styleUrls: ['./viewport.component.scss'],
  imports: [BsAlertComponent, BsCodeSnippetComponent, BsInViewportDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ViewportComponent {
  colors = Color;

  box1InViewport = false;
  box2InViewport = false;
  box3InViewport = false;

  onBox1ViewportChange(isInViewport: boolean) {
    this.box1InViewport = isInViewport;
  }

  onBox2ViewportChange(isInViewport: boolean) {
    this.box2InViewport = isInViewport;
  }

  onBox3ViewportChange(isInViewport: boolean) {
    this.box3InViewport = isInViewport;
  }

  protected readonly snippetBasicHtml = dedent`
    <div (bsInViewport)="onBoxViewportChange($event)">
      Box content. Listens for IntersectionObserver entries.
    </div>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component } from '@angular/core';
    import { BsInViewportDirective } from '@mintplayer/ng-bootstrap/viewport';

    @Component({
      selector: 'my-viewport-demo',
      templateUrl: './my-viewport-demo.component.html',
      imports: [BsInViewportDirective],
    })
    export class MyViewportDemoComponent {
      protected isInViewport = false;

      onBoxViewportChange(isInViewport: boolean) {
        this.isInViewport = isInViewport;
      }
    }
  `;
}
