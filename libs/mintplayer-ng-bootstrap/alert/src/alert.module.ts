import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsAlertComponent } from './alert/alert.component';
import { BsAlertCloseComponent } from './alert-close/alert-close.component';

@NgModule({
  imports: [CommonModule],
  declarations: [
    BsAlertComponent,
    BsAlertCloseComponent
  ],
  exports: [
    BsAlertComponent,
    BsAlertCloseComponent
  ]
})
export class BsAlertModule {}
