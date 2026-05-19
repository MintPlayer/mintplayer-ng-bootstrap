import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { dedent } from 'ts-dedent';

@Component({
  selector: 'demo-navigation-lock-master-detail',
  templateUrl: './navigation-lock-master-detail.component.html',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, BsCodeSnippetComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavigationLockMasterDetailComponent {
  protected readonly snippetBasicHtml = dedent`
    <nav>
      <a routerLink="a" routerLinkActive="active">Child A (locked)</a>
      <a routerLink="b" routerLinkActive="active">Child B (free)</a>
    </nav>
    <router-outlet></router-outlet>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component } from '@angular/core';
    import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

    @Component({
      selector: 'my-master-detail-demo',
      templateUrl: './my-master-detail-demo.component.html',
      imports: [RouterLink, RouterLinkActive, RouterOutlet],
    })
    export class MyMasterDetailDemoComponent {}
  `;
}
