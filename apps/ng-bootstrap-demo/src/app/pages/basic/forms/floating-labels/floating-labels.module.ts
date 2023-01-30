import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsFormModule } from '@mintplayer/ng-bootstrap/form';
import { BsFloatingLabelsModule } from '@mintplayer/ng-bootstrap/floating-labels';

import { FloatingLabelsRoutingModule } from './floating-labels-routing.module';
import { FloatingLabelsComponent } from './floating-labels.component';


@NgModule({
  declarations: [
    FloatingLabelsComponent
  ],
  imports: [
    CommonModule,
    BsFormModule,
    BsFloatingLabelsModule,
    FloatingLabelsRoutingModule
  ]
})
export class FloatingLabelsModule { }
