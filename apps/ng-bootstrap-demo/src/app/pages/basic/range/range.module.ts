import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { BsGridModule, BsRangeModule } from '@mintplayer/ng-bootstrap';

import { RangeRoutingModule } from './range-routing.module';
import { RangeComponent } from './range.component';


@NgModule({
  declarations: [
    RangeComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    BsGridModule,
    BsRangeModule,
    RangeRoutingModule
  ]
})
export class RangeModule { }
