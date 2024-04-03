import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OverlayModule } from '@angular/cdk/overlay';
import { BsContextMenuDirective } from './context-menu.directive';
import { BsHasOverlayComponent } from '@mintplayer/ng-bootstrap/has-overlay';

@NgModule({
  declarations: [
    BsContextMenuDirective
  ],
  imports: [
    CommonModule,
    BsHasOverlayComponent,
    OverlayModule
  ],
  exports: [
    BsContextMenuDirective,
    BsHasOverlayComponent
  ]
})
export class BsContextMenuModule { }
