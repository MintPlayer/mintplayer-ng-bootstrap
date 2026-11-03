import { Component, ChangeDetectionStrategy } from '@angular/core';
import { useBootstrap } from '@mintplayer/ng-bootstrap/machine';
import { bootstrapFormsPage } from '@mintplayer/ui-core/bootstrap/forms';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { FocusOnLoadDirective } from '@mintplayer/ng-focus-on-load';
import { dedent } from 'ts-dedent';

@Component({
  selector: 'demo-autofocus',
  templateUrl: './autofocus.component.html',
  styleUrls: ['./autofocus.component.scss'],
  imports: [BsCodeSnippetComponent, FocusOnLoadDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AutofocusComponent {
  constructor() {
    // Raw Bootstrap markup on this page: it installs the verbatim parts itself, never globally (#452).
    useBootstrap(bootstrapFormsPage);
  }


  protected readonly snippetBasicHtml = dedent`
    <input type="text" name="name" autofocus>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component } from '@angular/core';
    import { FocusOnLoadDirective } from '@mintplayer/ng-focus-on-load';

    @Component({
      selector: 'my-autofocus-demo',
      templateUrl: './my-autofocus-demo.component.html',
      imports: [FocusOnLoadDirective],
    })
    export class MyAutofocusDemoComponent {}
  `;

}
