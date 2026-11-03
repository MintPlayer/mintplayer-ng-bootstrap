import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { useBootstrap } from '@mintplayer/ng-bootstrap/machine';
import { bootstrapContainersPage } from '@mintplayer/ui-core/bootstrap/containers';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsCloseComponent } from '@mintplayer/ng-bootstrap/close';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { BsModalComponent, BsModalHeaderDirective } from '@mintplayer/ng-bootstrap/modal';
import { BsScrollspyComponent, BsScrollspyDirective } from '@mintplayer/ng-bootstrap/scrollspy';
import { dedent } from 'ts-dedent';

@Component({
  selector: 'demo-scrollspy',
  templateUrl: './scrollspy.component.html',
  styleUrls: ['./scrollspy.component.scss'],
  imports: [
    BsButtonTypeDirective,
    BsCloseComponent,
    BsCodeSnippetComponent,
    BsModalComponent,
    BsModalHeaderDirective,
    BsScrollspyComponent,
    BsScrollspyDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScrollspyComponent {
  constructor() {
    // Raw Bootstrap markup on this page: it installs the verbatim parts itself, never globally (#452).
    useBootstrap(bootstrapContainersPage);
  }

  readonly colors = Color;
  readonly isModalOpen = signal(false);

  protected readonly snippetBasicHtml = dedent`
    <bs-scrollspy>
      <h2 bsScrollspy>Section A</h2>
      <p>Content for section A...</p>

      <h2 bsScrollspy>Section B</h2>
      <p>Content for section B...</p>

      <h3 bsScrollspy>Subsection B1</h3>
      <p>Content for subsection B1...</p>
    </bs-scrollspy>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component } from '@angular/core';
    import {
      BsScrollspyComponent,
      BsScrollspyDirective,
    } from '@mintplayer/ng-bootstrap/scrollspy';

    @Component({
      selector: 'my-scrollspy-demo',
      templateUrl: './my-scrollspy-demo.component.html',
      imports: [BsScrollspyComponent, BsScrollspyDirective],
    })
    export class MyScrollspyDemoComponent {}
  `;

  protected readonly snippetModalHtml = dedent`
    <bs-modal [(open)]="isModalOpen" [scrollable]="true">
      <span *bsModalHeader>Title</span>
      <bs-scrollspy>
        <h3 bsScrollspy>Primary</h3>
        <p>...</p>
        <h3 bsScrollspy>Secondary</h3>
        <p>...</p>
      </bs-scrollspy>
    </bs-modal>
  `;
}
