import { Component, ChangeDetectionStrategy} from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { BsFormComponent, BsFormControlDirective } from '@mintplayer/ng-bootstrap/form';
import { BsInputGroupComponent } from '@mintplayer/ng-bootstrap/input-group';
import { dedent } from 'ts-dedent';

@Component({
  selector: 'demo-input-group',
  templateUrl: './input-group.component.html',
  styleUrls: ['./input-group.component.scss'],
  imports: [BsCodeSnippetComponent, BsFormComponent, BsFormControlDirective, BsInputGroupComponent, BsButtonTypeDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InputGroupComponent {
  colors = Color;

  protected readonly snippetBasicHtml = dedent`
    <bs-form>
      <bs-input-group>
        <button [color]="colors.secondary">Info</button>
        <input type="text">
        <button type="submit" [color]="colors.primary">Submit</button>
      </bs-input-group>
    </bs-form>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component } from '@angular/core';
    import { Color } from '@mintplayer/ng-bootstrap';
    import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
    import { BsFormComponent, BsFormControlDirective } from '@mintplayer/ng-bootstrap/form';
    import { BsInputGroupComponent } from '@mintplayer/ng-bootstrap/input-group';

    @Component({
      selector: 'my-input-group-demo',
      templateUrl: './my-input-group-demo.component.html',
      imports: [
        BsFormComponent,
        BsFormControlDirective,
        BsInputGroupComponent,
        BsButtonTypeDirective,
      ],
    })
    export class MyInputGroupDemoComponent {
      protected readonly colors = Color;
    }
  `;
}
