import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EnhancedPasteDirective } from './enhanced-paste.directive';

@NgModule({
  declarations: [
    EnhancedPasteDirective
  ],
  imports: [
    CommonModule
  ],
  exports: [
    EnhancedPasteDirective
  ]
})
export class EnhancedPasteModule { }
