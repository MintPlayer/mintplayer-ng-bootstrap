import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsResizableComponent } from './resizable/resizable.component';
import { BsResizeGlyphDirective } from './resize-glyph/resize-glyph.directive';

@NgModule({
  declarations: [
    BsResizableComponent,
    BsResizeGlyphDirective
  ],
  imports: [
    CommonModule
  ],
  exports: [
    BsResizableComponent,
    BsResizeGlyphDirective
  ]
})
export class BsResizableModule { }
