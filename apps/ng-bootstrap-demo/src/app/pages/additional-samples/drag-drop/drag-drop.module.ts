import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule as CdkDragDropModule } from '@angular/cdk/drag-drop';

import { DragDropRoutingModule } from './drag-drop-routing.module';
import { DragDropComponent } from './drag-drop.component';


@NgModule({
  declarations: [
    DragDropComponent
  ],
  imports: [
    CommonModule,
    CdkDragDropModule,
    DragDropRoutingModule
  ]
})
export class DragDropModule { }
