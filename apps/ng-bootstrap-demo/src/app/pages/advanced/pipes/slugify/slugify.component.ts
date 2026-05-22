import { Component, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BsFormComponent, BsFormControlDirective } from '@mintplayer/ng-bootstrap/form';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { BsSlugifyPipe } from '@mintplayer/ng-bootstrap/slugify';
import { dedent } from 'ts-dedent';
@Component({
  selector: 'demo-slugify',
  templateUrl: './slugify.component.html',
  styleUrls: ['./slugify.component.scss'],
  imports: [FormsModule, BsFormComponent, BsFormControlDirective, BsSlugifyPipe, BsCodeSnippetComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SlugifyComponent {
  text = 'Hello world';

  protected readonly snippetBasicHtml = dedent`
    <input type="text" [(ngModel)]="text">
    <label>{{ text | bsSlugify }}</label>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component } from '@angular/core';
    import { FormsModule } from '@angular/forms';
    import { BsSlugifyPipe } from '@mintplayer/ng-bootstrap/slugify';
    @Component({
      selector: 'my-slugify-demo',
      templateUrl: './my-slugify-demo.component.html',
      imports: [FormsModule, BsSlugifyPipe],
    })
    export class MySlugifyDemoComponent {
      protected text = 'Hello world';
    }
  `;
}
