import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HighlightModule } from 'ngx-highlightjs';
import { BsCopyModule } from '@mintplayer/ng-bootstrap/copy';
import { BsOffcanvasModule } from '@mintplayer/ng-bootstrap/offcanvas';
import { BsCodeSnippetComponent } from './code-snippet.component';

@NgModule({
  declarations: [
    BsCodeSnippetComponent
  ],
  imports: [
    CommonModule,
    BsCopyModule,
    BsOffcanvasModule,
    HighlightModule
  ],
  exports: [
    BsCodeSnippetComponent
  ]
})
export class BsCodeSnippetModule { }
