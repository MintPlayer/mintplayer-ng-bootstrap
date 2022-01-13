import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsForModule } from '@mintplayer/ng-bootstrap';

import { ForDirectiveRoutingModule } from './for-directive-routing.module';
import { ForDirectiveComponent } from './for-directive.component';


@NgModule({
  declarations: [
    ForDirectiveComponent
  ],
  imports: [
    CommonModule,
    BsForModule,
    ForDirectiveRoutingModule
  ]
})
export class ForDirectiveModule { }
