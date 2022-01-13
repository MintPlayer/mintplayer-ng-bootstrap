import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsAlertModule } from '@mintplayer/ng-bootstrap';

import { AlertRoutingModule } from './alert-routing.module';
import { AlertComponent } from './alert.component';


@NgModule({
  declarations: [
    AlertComponent
  ],
  imports: [
    CommonModule,
    BsAlertModule,
    AlertRoutingModule
  ]
})
export class AlertModule { }
