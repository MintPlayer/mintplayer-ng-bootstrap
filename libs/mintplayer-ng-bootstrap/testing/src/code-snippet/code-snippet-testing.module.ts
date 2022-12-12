import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsCodeSnippetMockComponent } from './code-snippet/code-snippet.component';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';

@NgModule({
  declarations: [BsCodeSnippetMockComponent],
  imports: [CommonModule],
  exports: [BsCodeSnippetMockComponent],
  providers: [
    { provide: BsCodeSnippetComponent, useClass: BsCodeSnippetMockComponent }
  ]
})
export class BsCodeSnippetTestingModule {}
