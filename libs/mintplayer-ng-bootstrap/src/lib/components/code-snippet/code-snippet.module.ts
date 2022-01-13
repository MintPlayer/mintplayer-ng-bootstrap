import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HighlightModule } from 'ngx-highlightjs';
import { BsCodeSnippetComponent } from './code-snippet.component';
import { BsCopyModule } from '../copy/copy.module';

@NgModule({
  declarations: [
    BsCodeSnippetComponent
  ],
  imports: [
    CommonModule,
    BsCopyModule,
    HighlightModule
  ],
  exports: [
    BsCodeSnippetComponent
  ]
})
export class BsCodeSnippetModule { }
