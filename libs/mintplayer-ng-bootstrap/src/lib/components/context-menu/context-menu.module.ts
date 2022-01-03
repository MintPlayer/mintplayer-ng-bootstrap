import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsContextMenuDirective } from './context-menu.directive';

@NgModule({
  declarations: [
    BsContextMenuDirective
  ],
  imports: [
    CommonModule
  ],
  exports: [
    BsContextMenuDirective
  ]
})
export class BsContextMenuModule { }
