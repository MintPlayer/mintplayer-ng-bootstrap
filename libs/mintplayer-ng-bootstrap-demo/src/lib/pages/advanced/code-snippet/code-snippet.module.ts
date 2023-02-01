import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsCodeSnippetModule } from '@mintplayer/ng-bootstrap/code-snippet';
import { BsSnackbarModule } from '@mintplayer/ng-bootstrap/snackbar';

import { CodeSnippetRoutingModule } from './code-snippet-routing.module';
import { CodeSnippetComponent } from './code-snippet.component';


@NgModule({
  declarations: [
    CodeSnippetComponent
  ],
  imports: [
    CommonModule,
    BsSnackbarModule,
    BsCodeSnippetModule,
    CodeSnippetRoutingModule
  ]
})
export class CodeSnippetModule { }
