import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsOffcanvasModule } from '@mintplayer/ng-bootstrap/offcanvas';
import { BsCodeSnippetModule } from '@mintplayer/ng-bootstrap/code-snippet';

import { CodeSnippetRoutingModule } from './code-snippet-routing.module';
import { CodeSnippetComponent } from './code-snippet.component';


@NgModule({
  declarations: [
    CodeSnippetComponent
  ],
  imports: [
    CommonModule,
    BsOffcanvasModule,
    BsCodeSnippetModule,
    CodeSnippetRoutingModule
  ]
})
export class CodeSnippetModule { }
