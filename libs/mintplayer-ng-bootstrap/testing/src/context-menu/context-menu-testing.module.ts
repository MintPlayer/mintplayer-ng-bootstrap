import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsContextMenuMockDirective } from './context-menu.directive';

@NgModule({
  declarations: [
    BsContextMenuMockDirective
  ],
  imports: [
    CommonModule
  ],
  exports: [
    BsContextMenuMockDirective
  ]
})
export class BsContextMenuTestingModule { }
