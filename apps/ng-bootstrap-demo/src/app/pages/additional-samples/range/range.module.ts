import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { RangeRoutingModule } from './range-routing.module';
import { RangeComponent } from './range.component';


@NgModule({
  declarations: [
    RangeComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    RangeRoutingModule
  ]
})
export class RangeModule { }
