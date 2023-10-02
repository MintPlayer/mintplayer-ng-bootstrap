import { Component, Input, TemplateRef, ViewChild } from '@angular/core';

@Component({
  selector: 'bs-code-snippet',
  templateUrl: './code-snippet.component.html',
  styleUrls: ['./code-snippet.component.scss']
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
