import { Component, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { BsColorPickerComponent } from '@mintplayer/ng-bootstrap/color-picker';
import { BsFontColorPipe } from '@mintplayer/ng-bootstrap/font-color';
import { dedent } from 'ts-dedent';
@Component({
  selector: 'demo-font-color',
  templateUrl: './font-color.component.html',
  styleUrls: ['./font-color.component.scss'],
  imports: [FormsModule, BsCodeSnippetComponent, BsColorPickerComponent, BsFontColorPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FontColorComponent {
  background = '#360984';

  protected readonly snippetBasicHtml = dedent`
    <div [style.background]="background" [style.color]="background | bsFontColor">
      Readable foreground
    </div>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component } from '@angular/core';
    import { BsFontColorPipe } from '@mintplayer/ng-bootstrap/font-color';
    @Component({
      selector: 'my-font-color-demo',
      templateUrl: './my-font-color-demo.component.html',
      imports: [BsFontColorPipe],
    })
    export class MyFontColorDemoComponent {
      protected background = '#360984';
    }
  `;
}
