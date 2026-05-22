import { Component, ChangeDetectionStrategy } from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsAlertComponent } from '@mintplayer/ng-bootstrap/alert';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { dedent } from 'ts-dedent';
@Component({
  selector: 'demo-anchor-scrolling',
  templateUrl: './anchor-scrolling.component.html',
  styleUrls: ['./anchor-scrolling.component.scss'],
  imports: [BsAlertComponent, BsCodeSnippetComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnchorScrollingComponent {
  colors = Color;

  protected readonly snippetBasicHtml = dedent`
    <nav>
      <a [routerLink]="[]" fragment="section1">Go to Section 1</a>
      <a [routerLink]="[]" fragment="section2">Go to Section 2</a>
    </nav>

    <section id="section1">
      <h2>Section 1</h2>
      <p>Target content for the first anchor.</p>
    </section>

    <section id="section2">
      <h2>Section 2</h2>
      <p>Target content for the second anchor.</p>
    </section>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component } from '@angular/core';
    import { RouterLink, provideRouter, withInMemoryScrolling } from '@angular/router';
    // In bootstrapApplication providers:
    // provideRouter(
    //   routes,
    //   withInMemoryScrolling({ anchorScrolling: 'enabled' }),
    // )

    @Component({
      selector: 'my-anchor-scrolling-demo',
      templateUrl: './my-anchor-scrolling-demo.component.html',
      imports: [RouterLink],
    })
    export class MyAnchorScrollingDemoComponent {}
  `;
}
