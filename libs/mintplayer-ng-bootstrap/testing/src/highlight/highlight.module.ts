import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HighlightMockDirective } from './highlight.directive';

@NgModule({
  declarations: [
    HighlightMockDirective
  ],
  imports: [
    CommonModule
  ],
  exports: [
    HighlightMockDirective
  ]
})
export class HighlightTestingModule { }
