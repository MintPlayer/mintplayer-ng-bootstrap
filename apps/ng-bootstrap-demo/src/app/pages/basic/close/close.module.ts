import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsCloseModule } from '@mintplayer/ng-bootstrap';

import { CloseRoutingModule } from './close-routing.module';
import { CloseComponent } from './close.component';


@NgModule({
  declarations: [
    CloseComponent
  ],
  imports: [
    CommonModule,
    BsCloseModule,
    CloseRoutingModule
  ]
})
export class CloseModule { }
