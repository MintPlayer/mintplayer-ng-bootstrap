import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsButtonGroupComponent } from '@mintplayer/ng-bootstrap/button-group';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsToggleButtonComponent } from '@mintplayer/ng-bootstrap/checkbox';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { dedent } from 'ts-dedent';

@Component({
  selector: 'demo-button-group',
  templateUrl: './button-group.component.html',
  styleUrls: ['./button-group.component.scss'],
  imports: [BsCodeSnippetComponent, BsButtonTypeDirective, BsButtonGroupComponent, BsToggleButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ButtonGroupComponent {
  colors = Color;
  protected readonly bold = signal(true);
  protected readonly italic = signal(false);
  protected readonly underline = signal(false);

  protected readonly snippetBasicHtml = dedent`
    <bs-button-group label="Text alignment">
      <button type="button" [color]="colors.secondary">Left</button>
      <button type="button" [color]="colors.secondary">Middle</button>
      <button type="button" [color]="colors.secondary">Right</button>
    </bs-button-group>

    <bs-button-group label="Text style" size="sm">
      <bs-toggle-button [(checked)]="bold" color="outline-secondary">Bold</bs-toggle-button>
      <bs-toggle-button [(checked)]="italic" color="outline-secondary">Italic</bs-toggle-button>
    </bs-button-group>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component, signal } from '@angular/core';
    import { Color } from '@mintplayer/ng-bootstrap';
    import { BsButtonGroupComponent } from '@mintplayer/ng-bootstrap/button-group';
    import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
    import { BsToggleButtonComponent } from '@mintplayer/ng-bootstrap/checkbox';

    @Component({
      selector: 'my-button-group-demo',
      templateUrl: './my-button-group-demo.component.html',
      imports: [BsButtonGroupComponent, BsButtonTypeDirective, BsToggleButtonComponent],
    })
    export class MyButtonGroupDemoComponent {
      protected readonly colors = Color;
      protected readonly bold = signal(true);
      protected readonly italic = signal(false);
    }
  `;
}
