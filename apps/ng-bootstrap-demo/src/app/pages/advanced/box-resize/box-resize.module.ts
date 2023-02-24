import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsBoxResizeModule } from '@mintplayer/ng-bootstrap/box-resize';

import { BoxResizeRoutingModule } from './box-resize-routing.module';
import { BoxResizeComponent } from './box-resize.component';


@NgModule({
  declarations: [
    BoxResizeComponent
  ],
  imports: [
    CommonModule,
    BsBoxResizeModule,
    BoxResizeRoutingModule
  ]
})
export class BoxResizeModule { }
