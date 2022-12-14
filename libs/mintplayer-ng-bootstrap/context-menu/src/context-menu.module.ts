import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OverlayModule } from '@angular/cdk/overlay';
import { BsContextMenuDirective } from './context-menu.directive';
import { BsHasOverlayModule } from '@mintplayer/ng-bootstrap/has-overlay';

@NgModule({
  declarations: [
    BsContextMenuDirective
  ],
  imports: [
    CommonModule,
    BsHasOverlayModule,
    OverlayModule
  ],
  exports: [
    BsContextMenuDirective,
    BsHasOverlayModule
  ]
})
export class BsContextMenuModule { }
