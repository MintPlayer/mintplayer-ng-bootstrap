import { Component, ChangeDetectionStrategy} from '@angular/core';
import { LazyLoadedComponent } from './components/lazy-loaded/lazy-loaded.component';
import { BsAlertComponent } from '@mintplayer/ng-bootstrap/alert';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { Color } from '@mintplayer/ng-bootstrap';
import { dedent } from 'ts-dedent';

@Component({
  selector: 'demo-lazy-loading',
  templateUrl: './lazy-loading.component.html',
  styleUrls: ['./lazy-loading.component.scss'],
  imports: [BsAlertComponent, BsCodeSnippetComponent, LazyLoadedComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LazyLoadingComponent {
  colors = Color;

  protected readonly snippetBasicHtml = dedent`
    @defer (on timer(5s)) {
      <demo-lazy-loaded></demo-lazy-loaded>
    } @placeholder {
      <span>Loading shortly…</span>
    }
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component } from '@angular/core';
    import { LazyLoadedComponent } from './lazy-loaded.component';

    @Component({
      selector: 'my-lazy-loading-demo',
      templateUrl: './my-lazy-loading-demo.component.html',
      imports: [LazyLoadedComponent],
    })
    export class MyLazyLoadingDemoComponent {}
  `;
}
