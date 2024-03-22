import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsModalModule } from '@mintplayer/ng-bootstrap/modal';
import { BsScrollspyModule } from '@mintplayer/ng-bootstrap/scrollspy';
import { BsButtonTypeModule } from '@mintplayer/ng-bootstrap/button-type';

import { ScrollspyRoutingModule } from './scrollspy-routing.module';
import { ScrollspyComponent } from './scrollspy.component';


@NgModule({
  declarations: [
    ScrollspyComponent
  ],
  imports: [
    CommonModule,
    BsModalModule,
    BsScrollspyModule,
    BsButtonTypeModule,
    ScrollspyRoutingModule
  ]
})
export class ScrollspyModule { }
