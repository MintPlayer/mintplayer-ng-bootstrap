import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsBoldPipe } from './bold/bold.pipe';
import { BsItalicPipe } from './italic/italic.pipe';
import { BsUnderlinePipe } from './underline/underline.pipe';
import { BsStrikethroughPipe } from './strikethrough/strikethrough.pipe';
import { BsMarkdownPipe } from './markdown/markdown.pipe';

@NgModule({
  declarations: [
    BsBoldPipe,
    BsItalicPipe,
    BsUnderlinePipe,
    BsStrikethroughPipe,
    BsMarkdownPipe
  ],
  imports: [
    CommonModule
  ],
  exports: [
    BsBoldPipe,
    BsItalicPipe,
    BsUnderlinePipe,
    BsStrikethroughPipe,
    BsMarkdownPipe
  ]
})
export class BsMarkdownModule { }
