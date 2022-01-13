import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsScrollspyModule } from '@mintplayer/ng-bootstrap';

import { ScrollspyRoutingModule } from './scrollspy-routing.module';
import { ScrollspyComponent } from './scrollspy.component';


@NgModule({
  declarations: [
    ScrollspyComponent
  ],
  imports: [
    CommonModule,
    BsScrollspyModule,
    ScrollspyRoutingModule
  ]
})
export class ScrollspyModule { }
