import { Component, ChangeDetectionStrategy} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BsFormComponent, BsFormControlDirective } from '@mintplayer/ng-bootstrap/form';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsBoldPipe, BsItalicPipe, BsStrikethroughPipe, BsUnderlinePipe } from '@mintplayer/ng-bootstrap/markdown';

@Component({
  selector: 'demo-markdown',
  templateUrl: './markdown.component.html',
  styleUrls: ['./markdown.component.scss'],
  imports: [FormsModule, BsFormComponent, BsFormControlDirective, BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsBoldPipe, BsItalicPipe, BsStrikethroughPipe, BsUnderlinePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarkdownComponent {
  markdownText = 'Hello **world**\r\n*This* is me\r\nLife <u>should</u> be\r\nFun for ~~everyone~~';
}
