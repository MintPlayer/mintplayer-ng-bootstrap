import { Component, ChangeDetectionStrategy } from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { EnumItem, EnumService } from '@mintplayer/ng-bootstrap/enum';
import { dedent } from 'ts-dedent';
@Component({
  selector: 'demo-button-type',
  templateUrl: './button-type.component.html',
  styleUrls: ['./button-type.component.scss'],
  imports: [BsCodeSnippetComponent, BsButtonTypeDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ButtonTypeComponent {
  constructor(private enumService: EnumService) {
    this.colorValues = this.enumService.getItems(Color);
  }

  colors = Color;
  colorValues: EnumItem[];

  protected readonly snippetBasicHtml = dedent`
    <button [color]="colors.primary">Primary action</button>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component } from '@angular/core';
    import { Color } from '@mintplayer/ng-bootstrap';
    import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
    @Component({
      selector: 'my-button-type-demo',
      templateUrl: './my-button-type-demo.component.html',
      imports: [BsButtonTypeDirective],
    })
    export class MyButtonTypeDemoComponent {
      protected readonly colors = Color;
    }
  `;
}
