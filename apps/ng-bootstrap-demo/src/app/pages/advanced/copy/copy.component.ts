import { Component } from '@angular/core';
import { BsViewState } from '@mintplayer/ng-bootstrap';
import * as dedent from 'dedent';

@Component({
  selector: 'demo-copy',
  templateUrl: './copy.component.html',
  styleUrls: ['./copy.component.scss']
})
export class CopyComponent {

  offcanvasState: BsViewState = 'closed';
  codeToCopy = dedent`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset=utf-8>
        <title>I'm the title</title>
      </head>
      <body>
        <p>I'm the content</p>
      </body>
    </html>`;

  
  copiedHtml() {
    this.offcanvasState = 'open';
    setTimeout(() => this.offcanvasState = 'closed', 3000);
  }
}
