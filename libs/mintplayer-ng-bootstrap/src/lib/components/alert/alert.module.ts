import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AlertComponent } from './alert/alert.component';
import { AlertCloseComponent } from './alert-close/alert-close.component';

@NgModule({
  imports: [CommonModule],
  declarations: [
    AlertComponent,
    AlertCloseComponent
  ],
  exports: [
    AlertComponent,
    AlertCloseComponent
  ]
})
export class NgBootstrapAlertModule {}
