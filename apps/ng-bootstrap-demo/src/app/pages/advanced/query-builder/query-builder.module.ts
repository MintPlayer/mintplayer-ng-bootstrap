import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsQueryBuilderModule } from '@mintplayer/ng-bootstrap/query-builder';

import { QueryBuilderRoutingModule } from './query-builder-routing.module';
import { QueryBuilderComponent } from './query-builder.component';


@NgModule({
  declarations: [
    QueryBuilderComponent
  ],
  imports: [
    CommonModule,
    BsQueryBuilderModule,
    QueryBuilderRoutingModule
  ]
})
export class QueryBuilderModule { }
