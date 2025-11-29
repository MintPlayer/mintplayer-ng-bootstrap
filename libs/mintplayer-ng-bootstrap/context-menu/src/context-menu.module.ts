import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OverlayModule } from '@angular/cdk/overlay';
import { BsContextMenuDirective } from './context-menu.directive';
import { BsOverlayComponent } from '@mintplayer/ng-bootstrap/overlay';

@NgModule({
  declarations: [
    BsContextMenuDirective
  ],
  imports: [
    CommonModule,
    BsOverlayComponent,
    OverlayModule
  ],
  exports: [
    BsContextMenuDirective,
    BsOverlayComponent
  ]
})
export class BsContextMenuModule { }
