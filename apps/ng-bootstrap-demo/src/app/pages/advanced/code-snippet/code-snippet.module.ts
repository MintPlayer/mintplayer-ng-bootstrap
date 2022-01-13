import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsCodeSnippetModule, BsSnackbarModule } from '@mintplayer/ng-bootstrap';

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
