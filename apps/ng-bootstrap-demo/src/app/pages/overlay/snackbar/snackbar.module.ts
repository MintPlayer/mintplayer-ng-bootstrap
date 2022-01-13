import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsSnackbarModule } from '@mintplayer/ng-bootstrap';

import { SnackbarRoutingModule } from './snackbar-routing.module';
import { SnackbarComponent } from './snackbar.component';


@NgModule({
  declarations: [
    SnackbarComponent
  ],
  imports: [
    CommonModule,
    BsSnackbarModule,
    SnackbarRoutingModule
  ]
})
export class SnackbarModule { }
