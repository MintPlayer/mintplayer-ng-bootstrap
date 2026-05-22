import { Component, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { BsFormComponent, BsFormControlDirective } from '@mintplayer/ng-bootstrap/form';
import { BsOrdinalNumberPipe } from '@mintplayer/ng-bootstrap/ordinal-number';
import { dedent } from 'ts-dedent';
@Component({
  selector: 'demo-ordinal-number',
  templateUrl: './ordinal-number.component.html',
  styleUrls: ['./ordinal-number.component.scss'],
  imports: [FormsModule, BsCodeSnippetComponent, BsFormComponent, BsFormControlDirective, BsOrdinalNumberPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrdinalNumberComponent {
  text = 'This is the 1st demo of how you can use the BsOrdinalNumberPipe. The 2nd and 3rd demo also work as expected.';

  protected readonly snippetBasicHtml = dedent`
    <span [innerHTML]="text | ordinalNumber: 'st':'nd':'rd':'th'"></span>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component } from '@angular/core';
    import { BsOrdinalNumberPipe } from '@mintplayer/ng-bootstrap/ordinal-number';
    @Component({
      selector: 'my-ordinal-demo',
      templateUrl: './my-ordinal-demo.component.html',
      imports: [BsOrdinalNumberPipe],
    })
    export class MyOrdinalDemoComponent {
      protected text = 'The 1st, 2nd, 3rd and 4th places.';
    }
  `;
}
