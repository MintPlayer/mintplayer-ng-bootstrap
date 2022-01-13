import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsListGroupModule } from '@mintplayer/ng-bootstrap';

import { ListGroupRoutingModule } from './list-group-routing.module';
import { ListGroupComponent } from './list-group.component';


@NgModule({
  declarations: [
    ListGroupComponent
  ],
  imports: [
    CommonModule,
    BsListGroupModule,
    ListGroupRoutingModule
  ]
})
export class ListGroupModule { }
