import { Component, Input, TemplateRef, ViewChild } from '@angular/core';
import { BsCopyModule } from '@mintplayer/ng-bootstrap/copy';
import { BsOffcanvasModule } from '@mintplayer/ng-bootstrap/offcanvas';
import { HighlightModule } from 'ngx-highlightjs';

@Component({
  selector: 'bs-code-snippet',
  templateUrl: './code-snippet.component.html',
  styleUrls: ['./code-snippet.component.scss'],
  standalone: true,
  imports: [BsCopyModule, BsOffcanvasModule, HighlightModule]
})
export class BsCodeSnippetComponent {

  offcanvasVisible = false;
  @Input() public codeToCopy = '';
  @Input() public languages: string[] | null = null;
  @Input() public lineNumbers = false;
  @ViewChild('copiedTemplate') copiedTemplate!: TemplateRef<any>;

  copiedHtml() {
    this.offcanvasVisible = true;
    setTimeout(() => this.offcanvasVisible = false, 3000);
  }

}
