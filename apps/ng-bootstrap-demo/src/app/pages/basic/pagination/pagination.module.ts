import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsPaginationModule } from '@mintplayer/ng-bootstrap';

import { PaginationRoutingModule } from './pagination-routing.module';
import { PaginationComponent } from './pagination.component';


@NgModule({
  declarations: [
    PaginationComponent
  ],
  imports: [
    CommonModule,
    BsPaginationModule,
    PaginationRoutingModule
  ]
})
export class PaginationModule { }
