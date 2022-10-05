import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsGridModule } from '@mintplayer/ng-bootstrap';

import { GridRoutingModule } from './grid-routing.module';
import { GridComponent } from './grid.component';


@NgModule({
  declarations: [
    GridComponent
  ],
  imports: [
    CommonModule,
    BsGridModule,
    GridRoutingModule
  ]
})
export class GridModule { }
