import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { BsSnackbarModule } from '@mintplayer/ng-bootstrap/snackbar';
import { BsButtonTypeModule } from '@mintplayer/ng-bootstrap/button-type';

import { SnackbarRoutingModule } from './snackbar-routing.module';
import { SnackbarComponent } from './snackbar.component';


@NgModule({
  declarations: [
    SnackbarComponent
  ],
  imports: [
    CommonModule,
    BsGridModule,
    BsSnackbarModule,
    BsButtonTypeModule,
    SnackbarRoutingModule
  ]
})
export class SnackbarModule { }
