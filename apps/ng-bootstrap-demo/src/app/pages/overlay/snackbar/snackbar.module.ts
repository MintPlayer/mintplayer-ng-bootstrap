import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsGridModule, BsSnackbarModule } from '@mintplayer/ng-bootstrap';

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
    SnackbarRoutingModule
  ]
})
export class SnackbarModule { }
