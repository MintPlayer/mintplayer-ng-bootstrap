import { Component, ChangeDetectionStrategy} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { BsFormComponent, BsFormControlDirective } from '@mintplayer/ng-bootstrap/form';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsBoldPipe, BsItalicPipe, BsStrikethroughPipe, BsUnderlinePipe } from '@mintplayer/ng-bootstrap/markdown';
import { dedent } from 'ts-dedent';

@Component({
  selector: 'demo-markdown',
  templateUrl: './markdown.component.html',
  styleUrls: ['./markdown.component.scss'],
  imports: [FormsModule, BsCodeSnippetComponent, BsFormComponent, BsFormControlDirective, BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsBoldPipe, BsItalicPipe, BsStrikethroughPipe, BsUnderlinePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarkdownComponent {
  markdownText = 'Hello **world**\r\n*This* is me\r\nLife <u>should</u> be\r\nFun for ~~everyone~~';

  protected readonly snippetBasicHtml = dedent`
    <span [innerHTML]="text | bsBold | bsItalic | bsUnderline | bsStrikethrough"></span>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component } from '@angular/core';
    import {
      BsBoldPipe,
      BsItalicPipe,
      BsStrikethroughPipe,
      BsUnderlinePipe,
    } from '@mintplayer/ng-bootstrap/markdown';

    @Component({
      selector: 'my-markdown-demo',
      templateUrl: './my-markdown-demo.component.html',
      imports: [BsBoldPipe, BsItalicPipe, BsStrikethroughPipe, BsUnderlinePipe],
    })
    export class MyMarkdownDemoComponent {
      protected text = 'Hello **world** ~~strike~~ *italic* <u>underline</u>';
    }
  `;
}
