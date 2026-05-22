import { Component, ChangeDetectionStrategy} from '@angular/core';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { BsFloatingLabelComponent } from '@mintplayer/ng-bootstrap/floating-labels';
import { BsFormComponent, BsFormControlDirective } from '@mintplayer/ng-bootstrap/form';
import { dedent } from 'ts-dedent';

@Component({
  selector: 'demo-floating-labels',
  templateUrl: './floating-labels.component.html',
  styleUrls: ['./floating-labels.component.scss'],
  imports: [BsCodeSnippetComponent, BsFormComponent, BsFormControlDirective, BsFloatingLabelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FloatingLabelsComponent {
  protected readonly snippetBasicHtml = dedent`
    <bs-form>
      <bs-floating-label class="d-block">
        <input type="email" placeholder="name@example.com">
        <label>Email address</label>
      </bs-floating-label>
    </bs-form>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component } from '@angular/core';
    import { BsFloatingLabelComponent } from '@mintplayer/ng-bootstrap/floating-labels';
    import { BsFormComponent, BsFormControlDirective } from '@mintplayer/ng-bootstrap/form';

    @Component({
      selector: 'my-floating-labels-demo',
      templateUrl: './my-floating-labels-demo.component.html',
      imports: [BsFormComponent, BsFormControlDirective, BsFloatingLabelComponent],
    })
    export class MyFloatingLabelsDemoComponent {}
  `;
}
