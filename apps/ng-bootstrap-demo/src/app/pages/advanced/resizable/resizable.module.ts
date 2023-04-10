import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsResizableModule } from '@mintplayer/ng-bootstrap/resizable';

import { ResizableRoutingModule } from './resizable-routing.module';
import { ResizableComponent } from './resizable.component';


@NgModule({
  declarations: [
    ResizableComponent
  ],
  imports: [
    CommonModule,
    BsResizableModule,
    ResizableRoutingModule
  ]
})
export class ResizableModule { }
