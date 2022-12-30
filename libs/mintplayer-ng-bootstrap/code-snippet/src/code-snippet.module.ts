import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HighlightModule } from 'ngx-highlightjs';
import { BsCopyModule } from '@mintplayer/ng-bootstrap/copy';
import { BsSnackbarModule } from '@mintplayer/ng-bootstrap/snackbar';
import { BsCodeSnippetComponent } from './code-snippet.component';

@NgModule({
  declarations: [
    BsCodeSnippetComponent
  ],
  imports: [
    CommonModule,
    BsCopyModule,
    BsSnackbarModule,
    HighlightModule
  ],
  exports: [
    BsCodeSnippetComponent
  ]
})
export class BsCodeSnippetModule { }
