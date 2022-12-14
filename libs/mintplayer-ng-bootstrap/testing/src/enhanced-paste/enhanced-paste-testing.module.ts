import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EnhancedPasteMockDirective } from './enhanced-paste.directive';

@NgModule({
  declarations: [
    EnhancedPasteMockDirective
  ],
  imports: [
    CommonModule
  ],
  exports: [
    EnhancedPasteMockDirective
  ]
})
export class EnhancedPasteTestingModule { }
