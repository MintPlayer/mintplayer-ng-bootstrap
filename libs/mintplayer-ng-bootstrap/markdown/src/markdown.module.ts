import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsBoldPipe } from './bold/bold.pipe';
import { BsItalicPipe } from './italic/italic.pipe';
import { BsUnderlinePipe } from './underline/underline.pipe';
import { BsStrikethroughPipe } from './strikethrough/strikethrough.pipe';

@NgModule({
  declarations: [
    BsBoldPipe,
    BsItalicPipe,
    BsUnderlinePipe,
    BsStrikethroughPipe,
  ],
  imports: [
    CommonModule
  ],
  exports: [
    BsBoldPipe,
    BsItalicPipe,
    BsUnderlinePipe,
    BsStrikethroughPipe,
  ]
})
export class BsMarkdownModule { }
