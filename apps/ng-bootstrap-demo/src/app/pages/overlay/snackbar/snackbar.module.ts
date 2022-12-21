import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { BsAlertModule } from '@mintplayer/ng-bootstrap/alert';
import { BsSnackbarModule } from '@mintplayer/ng-bootstrap/snackbar';
import { BsButtonTypeModule } from '@mintplayer/ng-bootstrap/button-type';
import { BsButtonGroupModule } from '@mintplayer/ng-bootstrap/button-group';

import { SnackbarRoutingModule } from './snackbar-routing.module';
import { SnackbarComponent } from './snackbar.component';


@NgModule({
  declarations: [
    SnackbarComponent
  ],
  imports: [
    CommonModule,
    BsGridModule,
    BsAlertModule,
    BsSnackbarModule,
    BsButtonTypeModule,
    BsButtonGroupModule,
    SnackbarRoutingModule
  ]
})
export class SnackbarModule { }
