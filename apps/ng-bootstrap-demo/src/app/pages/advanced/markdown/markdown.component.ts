import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BsFormModule } from '@mintplayer/ng-bootstrap/form';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { BsBoldPipe, BsItalicPipe, BsStrikethroughPipe, BsUnderlinePipe } from '@mintplayer/ng-bootstrap/markdown';

@Component({
  selector: 'demo-markdown',
  templateUrl: './markdown.component.html',
  styleUrls: ['./markdown.component.scss'],
  standalone: true,
  imports: [FormsModule, BsFormModule, BsGridModule, BsBoldPipe, BsItalicPipe, BsStrikethroughPipe, BsUnderlinePipe]
})
export class MarkdownComponent {
  markdownText = 'Hello **world**\r\n*This* is me\r\nLife <u>should</u> be\r\nFun for ~~everyone~~';
}
