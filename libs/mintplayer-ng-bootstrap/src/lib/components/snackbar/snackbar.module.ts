import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OverlayModule } from '@angular/cdk/overlay';
import { BsSnackbarComponent } from './component/snackbar.component';
import { BsSnackbarCloseDirective } from './directives/snackbar-close/snackbar-close.directive';

@NgModule({
  declarations: [
    BsSnackbarComponent,
    BsSnackbarCloseDirective
  ],
  imports: [
    CommonModule,
    OverlayModule
  ],
  exports: [
    BsSnackbarComponent,
    BsSnackbarCloseDirective
  ]
})
export class BsSnackbarModule { }
