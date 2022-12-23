import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsFloatingLabelsModule } from '@mintplayer/ng-bootstrap/floating-labels';

import { FloatingLabelsRoutingModule } from './floating-labels-routing.module';
import { FloatingLabelsComponent } from './floating-labels.component';


@NgModule({
  declarations: [
    FloatingLabelsComponent
  ],
  imports: [
    CommonModule,
    BsFloatingLabelsModule,
    FloatingLabelsRoutingModule
  ]
})
export class FloatingLabelsModule { }
