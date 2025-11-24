import { Component } from '@angular/core';
import { BsCopyDirective } from '@mintplayer/ng-bootstrap/copy';
import { BsOffcanvasModule } from '@mintplayer/ng-bootstrap/offcanvas';
import { HighlightModule } from 'ngx-highlightjs';
import { dedent } from 'ts-dedent';

@Component({
  selector: 'demo-copy',
  templateUrl: './copy.component.html',
  styleUrls: ['./copy.component.scss'],
  imports: [BsCopyDirective, BsOffcanvasModule, HighlightModule],
})
export class CopyComponent {

  offcanvasVisible = false;
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
    this.offcanvasVisible = true;
    setTimeout(() => this.offcanvasVisible = false, 3000);
  }
}
