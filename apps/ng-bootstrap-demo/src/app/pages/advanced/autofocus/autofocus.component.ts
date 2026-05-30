import { Component, ChangeDetectionStrategy } from '@angular/core';
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
