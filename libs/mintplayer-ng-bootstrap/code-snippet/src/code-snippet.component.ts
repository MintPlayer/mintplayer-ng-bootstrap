import { Component, Input, TemplateRef, ViewChild } from '@angular/core';
import { BsViewState } from '@mintplayer/ng-bootstrap';

@Component({
  selector: 'bs-code-snippet',
  templateUrl: './code-snippet.component.html',
  styleUrls: ['./code-snippet.component.scss']
})
export class BsCodeSnippetComponent {

  offcanvasState: BsViewState = 'closed';
  @Input() public codeToCopy = '';
  @Input() public languages: string[] | null = null;
  @Input() public lineNumbers = false;
  @ViewChild('copiedTemplate') copiedTemplate!: TemplateRef<any>;

  copiedHtml() {
    this.offcanvasState = 'open';
    setTimeout(() => this.offcanvasState = 'closed', 3000);
  }

}
