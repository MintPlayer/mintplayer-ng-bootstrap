import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { BsFormModule } from '@mintplayer/ng-bootstrap/form';
import { BsAlertModule } from '@mintplayer/ng-bootstrap/alert';
import { BsTrackByModule } from '@mintplayer/ng-bootstrap/track-by';
import { BsButtonTypeModule } from '@mintplayer/ng-bootstrap/button-type';
import { BsInputGroupModule } from '@mintplayer/ng-bootstrap/input-group';

import { AlertRoutingModule } from './alert-routing.module';
import { AlertComponent } from './alert.component';


@NgModule({
  declarations: [
    AlertComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    BsFormModule,
    BsAlertModule,
    BsTrackByModule,
    BsInputGroupModule,
    BsButtonTypeModule,
    AlertRoutingModule
  ]
})
export class AlertModule { }
