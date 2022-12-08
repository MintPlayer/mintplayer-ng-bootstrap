import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OverlayModule } from '@angular/cdk/overlay';
import { BsContextMenuDirective } from './context-menu.directive';

@NgModule({
  declarations: [
    BsContextMenuDirective
  ],
  imports: [
    CommonModule,
    OverlayModule
  ],
  exports: [
    BsContextMenuDirective
  ]
})
export class BsContextMenuModule { }
