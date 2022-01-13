import { Component, TemplateRef, ViewChild } from '@angular/core';
import { BsSnackbarService } from '@mintplayer/ng-bootstrap';

@Component({
  selector: 'demo-copy',
  templateUrl: './copy.component.html',
  styleUrls: ['./copy.component.scss']
})
export class CopyComponent {

  constructor(private snackbarService: BsSnackbarService) {
  }

  @ViewChild('copiedTemplate') copiedTemplate!: TemplateRef<any>;
  htmlToCopy = 
`<!DOCTYPE html>
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
    const snackbar = this.snackbarService.show(this.copiedTemplate);
    setTimeout(() => this.snackbarService.hide(snackbar), 3000);
  }
}
