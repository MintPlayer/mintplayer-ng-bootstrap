import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { BasicRoutingModule } from './basic-routing.module';
import { BasicComponent } from './basic.component';


@NgModule({
  declarations: [
    BasicComponent
  ],
  imports: [
    CommonModule,
    BasicRoutingModule
  ]
})
export class BasicModule { }
