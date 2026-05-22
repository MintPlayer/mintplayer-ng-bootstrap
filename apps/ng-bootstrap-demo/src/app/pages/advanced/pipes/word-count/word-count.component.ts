import { Component, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BsFormComponent, BsFormControlDirective } from '@mintplayer/ng-bootstrap/form';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { BsWordCountPipe } from '@mintplayer/ng-bootstrap/word-count';
import { dedent } from 'ts-dedent';
@Component({
  selector: 'demo-word-count',
  templateUrl: './word-count.component.html',
  styleUrls: ['./word-count.component.scss'],
  imports: [FormsModule, BsFormComponent, BsFormControlDirective, BsWordCountPipe, BsCodeSnippetComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WordCountComponent {
  text = 'Lorem ipsum dolor sit amet consectetur, adipisicing elit. Repellendus adipisci, nemo, similique ullam alias a error eveniet omnis ducimus aliquid numquam doloremque, necessitatibus dolores amet. Rem tenetur veritatis ut deserunt.';

  protected readonly snippetBasicHtml = dedent`
    <textarea rows="8" [(ngModel)]="text"></textarea>
    <span>{{ text | bsWordCount }}</span>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component } from '@angular/core';
    import { FormsModule } from '@angular/forms';
    import { BsWordCountPipe } from '@mintplayer/ng-bootstrap/word-count';
    @Component({
      selector: 'my-word-count-demo',
      templateUrl: './my-word-count-demo.component.html',
      imports: [FormsModule, BsWordCountPipe],
    })
    export class MyWordCountDemoComponent {
      protected text = 'The quick brown fox jumps over the lazy dog';
    }
  `;
}
