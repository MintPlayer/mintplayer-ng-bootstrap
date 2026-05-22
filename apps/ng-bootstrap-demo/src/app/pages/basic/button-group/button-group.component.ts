import { Component, ChangeDetectionStrategy } from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsButtonGroupComponent } from '@mintplayer/ng-bootstrap/button-group';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { dedent } from 'ts-dedent';
@Component({
  selector: 'demo-button-group',
  templateUrl: './button-group.component.html',
  styleUrls: ['./button-group.component.scss'],
  imports: [BsCodeSnippetComponent, BsButtonTypeDirective, BsButtonGroupComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ButtonGroupComponent {
  colors = Color;

  protected readonly snippetBasicHtml = dedent`
    <bs-button-group>
      <button type="button" [color]="colors.secondary">Left</button>
      <button type="button" [color]="colors.secondary">Middle</button>
      <button type="button" [color]="colors.secondary">Right</button>
    </bs-button-group>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component } from '@angular/core';
    import { Color } from '@mintplayer/ng-bootstrap';
    import { BsButtonGroupComponent } from '@mintplayer/ng-bootstrap/button-group';
    import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
    @Component({
      selector: 'my-button-group-demo',
      templateUrl: './my-button-group-demo.component.html',
      imports: [BsButtonGroupComponent, BsButtonTypeDirective],
    })
    export class MyButtonGroupDemoComponent {
      protected readonly colors = Color;
    }
  `;
}
