import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { BsRangeModule } from '@mintplayer/ng-bootstrap/range';
import { BsToggleButtonModule } from '@mintplayer/ng-bootstrap/toggle-button';

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
    BsToggleButtonModule,
    RangeRoutingModule
  ]
})
export class RangeModule { }
