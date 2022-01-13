import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { FloatingLabelsRoutingModule } from './floating-labels-routing.module';
import { FloatingLabelsComponent } from './floating-labels.component';


@NgModule({
  declarations: [
    FloatingLabelsComponent
  ],
  imports: [
    CommonModule,
    FloatingLabelsRoutingModule
  ]
})
export class FloatingLabelsModule { }
