import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsSnackbarService } from '@mintplayer/ng-bootstrap/snackbar';
import { BsSnackbarMockService } from './service/snackbar.service';

@NgModule({
  declarations: [],
  imports: [
    CommonModule
  ],
  providers: [
    { provide: BsSnackbarService, useClass: BsSnackbarMockService }
  ]
})
export class BsSnackbarTestingModule { }
