import { Component, Input } from '@angular/core';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';

@Component({
  selector: 'bs-code-snippet',
  templateUrl: './code-snippet.component.html',
  styleUrls: ['./code-snippet.component.scss'],
  providers: [
    { provide: BsCodeSnippetComponent, useExisting: BsCodeSnippetMockComponent }
  ]
})
export class BsCodeSnippetMockComponent {
  @Input() htmlToCopy = '';
}
