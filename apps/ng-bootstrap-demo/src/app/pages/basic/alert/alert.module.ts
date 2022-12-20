import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { BsAlertModule } from '@mintplayer/ng-bootstrap/alert';
import { BsButtonTypeModule } from '@mintplayer/ng-bootstrap/button-type';

import { AlertRoutingModule } from './alert-routing.module';
import { AlertComponent } from './alert.component';


@NgModule({
  declarations: [
    AlertComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    BsAlertModule,
    BsButtonTypeModule,
    AlertRoutingModule
  ]
})
export class AlertModule { }
