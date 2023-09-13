import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsFormModule } from '@mintplayer/ng-bootstrap/form';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { BsSearchboxModule } from '@mintplayer/ng-bootstrap/searchbox';

import { SearchboxRoutingModule } from './searchbox-routing.module';
import { SearchboxComponent } from './searchbox.component';


@NgModule({
  declarations: [
    SearchboxComponent
  ],
  imports: [
    CommonModule,
    BsFormModule,
    BsGridModule,
    BsSearchboxModule,
    SearchboxRoutingModule
  ]
})
export class SearchboxModule { }
