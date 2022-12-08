import { Component, Input, TemplateRef, ViewChild } from '@angular/core';
import { BsSnackbarService } from '@mintplayer/ng-bootstrap/snackbar';

@Component({
  selector: 'bs-code-snippet',
  templateUrl: './code-snippet.component.html',
  styleUrls: ['./code-snippet.component.scss']
})
export class BsCodeSnippetComponent {

  constructor(private snackbarService: BsSnackbarService) {
  }
  
  @Input() public htmlToCopy = '';
  @ViewChild('copiedTemplate') copiedTemplate!: TemplateRef<any>;

  copiedHtml() {
    const snackbar = this.snackbarService.show(this.copiedTemplate);
    setTimeout(() => this.snackbarService.hide(snackbar), 3000);
  }

}
