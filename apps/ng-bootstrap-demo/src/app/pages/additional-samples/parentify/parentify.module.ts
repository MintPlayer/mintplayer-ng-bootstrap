import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';

import { ParentifyRoutingModule } from './parentify-routing.module';
import { ParentifyComponent } from './parentify.component';


@NgModule({
  declarations: [
    ParentifyComponent
  ],
  imports: [
    CommonModule,
    BsGridModule,
    ParentifyRoutingModule
  ]
})
export class ParentifyModule { }
