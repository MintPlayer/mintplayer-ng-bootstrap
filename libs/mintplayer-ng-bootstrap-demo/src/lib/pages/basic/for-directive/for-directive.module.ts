import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsForModule } from '@mintplayer/ng-bootstrap/for';
import { BsFormModule } from '@mintplayer/ng-bootstrap/form';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';

import { ForDirectiveRoutingModule } from './for-directive-routing.module';
import { ForDirectiveComponent } from './for-directive.component';


@NgModule({
  declarations: [
    ForDirectiveComponent
  ],
  imports: [
    CommonModule,
    BsForModule,
    BsFormModule,
    BsGridModule,
    ForDirectiveRoutingModule
  ]
})
export class ForDirectiveModule { }
