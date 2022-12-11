import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OverlayModule } from '@angular/cdk/overlay';
import { BsHasOverlayModule } from '@mintplayer/ng-bootstrap/has-overlay';
import { BsSnackbarComponent } from './component/snackbar.component';
import { BsSnackbarCloseDirective } from './directives/snackbar-close/snackbar-close.directive';
import { BsSnackbarService } from './service/snackbar.service';

@NgModule({
  declarations: [
    BsSnackbarComponent,
    BsSnackbarCloseDirective
  ],
  imports: [
    CommonModule,
    BsHasOverlayModule,
    OverlayModule
  ],
  exports: [
    BsSnackbarComponent,
    BsSnackbarCloseDirective
  ],
  providers: [
    BsSnackbarService
  ]
})
export class BsSnackbarModule { }
