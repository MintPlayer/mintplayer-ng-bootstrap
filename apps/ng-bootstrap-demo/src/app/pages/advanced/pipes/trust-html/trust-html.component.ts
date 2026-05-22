import { Component, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BsFormComponent, BsFormControlDirective } from '@mintplayer/ng-bootstrap/form';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { BsTrustHtmlPipe } from '@mintplayer/ng-bootstrap/trust-html';
import { dedent } from 'ts-dedent';
@Component({
  selector: 'demo-trust-html',
  templateUrl: './trust-html.component.html',
  styleUrls: ['./trust-html.component.scss'],
  imports: [FormsModule, BsFormComponent, BsFormControlDirective, BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsTrustHtmlPipe, BsCodeSnippetComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrustHtmlComponent {
  html = '';

  protected readonly snippetBasicHtml = dedent`
    <span [innerHTML]="html | bsTrustHtml"></span>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component } from '@angular/core';
    import { BsTrustHtmlPipe } from '@mintplayer/ng-bootstrap/trust-html';
    @Component({
      selector: 'my-trust-html-demo',
      templateUrl: './my-trust-html-demo.component.html',
      imports: [BsTrustHtmlPipe],
    })
    export class MyTrustHtmlDemoComponent {
      protected html = '<strong>Bold</strong> + <em>italic</em>';
    }
  `;
}
