import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { BsNoNoscriptModule } from '@mintplayer/ng-bootstrap/no-noscript';
import { BsTabControlComponent } from './tab-control/tab-control.component';
import { BsTabPageComponent } from './tab-page/tab-page.component';

@NgModule({
  declarations: [
    BsTabControlComponent,
    BsTabPageComponent,
  ],
  imports: [
    CommonModule,
    DragDropModule,
    BsNoNoscriptModule
  ],
  exports: [
    BsTabControlComponent,
    BsTabPageComponent,
  ]
})
export class BsTabControlModule { }
