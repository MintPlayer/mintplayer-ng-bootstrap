import { Component } from '@angular/core';

@Component({
  selector: 'demo-markdown',
  templateUrl: './markdown.component.html',
  styleUrls: ['./markdown.component.scss']
})
export class MarkdownComponent {
  markdownText = 'Hello **world**\r\n*This* is me\r\nLife <u>should</u> be\r\nFun for ~~everyone~~';
}
