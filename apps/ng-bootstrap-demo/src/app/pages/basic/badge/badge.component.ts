import { Component, ChangeDetectionStrategy} from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsBadgeComponent } from '@mintplayer/ng-bootstrap/badge';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { dedent } from 'ts-dedent';

@Component({
  selector: 'demo-badge',
  templateUrl: './badge.component.html',
  styleUrls: ['./badge.component.scss'],
  imports: [BsCodeSnippetComponent, BsBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BadgeComponent {
  colors = Color;

  protected readonly snippetBasicHtml = dedent`
    <h2>
      Inbox
      <bs-badge [type]="colors.primary">5</bs-badge>
    </h2>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component } from '@angular/core';
    import { Color } from '@mintplayer/ng-bootstrap';
    import { BsBadgeComponent } from '@mintplayer/ng-bootstrap/badge';

    @Component({
      selector: 'my-badge-demo',
      templateUrl: './my-badge-demo.component.html',
      imports: [BsBadgeComponent],
    })
    export class MyBadgeDemoComponent {
      protected readonly colors = Color;
    }
  `;
}
