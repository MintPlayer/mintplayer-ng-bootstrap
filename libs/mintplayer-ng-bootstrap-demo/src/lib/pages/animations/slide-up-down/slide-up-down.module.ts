import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { BsButtonTypeModule } from '@mintplayer/ng-bootstrap/button-type';

import { SlideUpDownRoutingModule } from './slide-up-down-routing.module';
import { SlideUpDownComponent } from './slide-up-down.component';


@NgModule({
  declarations: [
    SlideUpDownComponent
  ],
  imports: [
    CommonModule,
    BsGridModule,
    BsButtonTypeModule,
    SlideUpDownRoutingModule
  ]
})
export class SlideUpDownModule { }
